import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/', // Allow public access to home page for sign-in redirect
])

export default clerkMiddleware(async (auth, req) => {
  // Get pathname from request
  const { pathname } = req.nextUrl;
  
  // Check if it's an admin route (but don't use the variable)
  pathname.startsWith('/admin');
  
  // If it's a public route, allow access
  if (isPublicRoute(req)) {
    return;
  }
  
  // For all other routes, require authentication
  const authResult = await auth();
  if (!authResult.userId) {
    return authResult.redirectToSignIn();
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
} 