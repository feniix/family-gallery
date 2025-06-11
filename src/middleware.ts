import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { logAccess, createAccessTimer } from '@/lib/access-logger'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/', // Allow public access to home page for sign-in redirect
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
      response = NextResponse.next();
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