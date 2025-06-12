import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { logAccess, createAccessTimer } from '@/lib/access-logger'
import { checkUserHasAccessSmart } from '@/lib/server-auth'
import { authLogger } from './lib/logger'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/', // Allow public access to home page for sign-in redirect
  '/pending-approval', // Allow access to pending approval page
  '/api/webhooks/(.*)', // Allow access to webhook endpoints
  '/api/auto-create-admin', // Allow access to auto-create-admin endpoint
  '/api/debug/cleanup-users', // Allow access to debug cleanup endpoint
])

export default clerkMiddleware(async (auth, req) => {
  // Start timing for access log
  const startTime = createAccessTimer();
  
  // Get pathname from request
  const { pathname } = req.nextUrl;
  
  // Check if it's an admin route (but don't use the variable)
  pathname.startsWith('/admin');
  
  let response: Response;
  
  // If it's a public route, allow access
  if (isPublicRoute(req)) {
    response = NextResponse.next();
  } else {
    // For all other routes, require authentication
    const authResult = await auth();
    if (!authResult.userId) {
      response = authResult.redirectToSignIn();
    } else {
      // Debug logging
      authLogger.debug('Middleware processing request', {
        userId: authResult.userId,
        pathname
      });

      // Check if user has access (check admin email first, then database)
      const hasAccess = await checkUserHasAccessSmart(authResult);
      
      authLogger.debug('Access check completed', { hasAccess, pathname });
      
      if (!hasAccess && pathname !== '/pending-approval') {
        // Redirect to pending approval page
        const pendingUrl = new URL('/pending-approval', req.url);
        response = NextResponse.redirect(pendingUrl);
      } else {
        response = NextResponse.next();
      }
    }
  }
  
  // Convert to NextResponse for logging if needed
  const nextResponse = response instanceof NextResponse ? response : new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  
  // Log the access in structured format
  logAccess(req, nextResponse, startTime);
  
  return response;
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

