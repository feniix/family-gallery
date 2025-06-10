import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware to protect API routes requiring authentication
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireAuthAPI(_req: NextRequest) {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return { userId }
}

/**
 * Middleware to protect API routes requiring admin access
 */
export async function requireAdminAPI(req: NextRequest) {
  const authResult = await requireAuthAPI(req)
  
  // If auth failed, return the error response
  if ('status' in authResult) {
    return authResult
  }

  const { userId } = authResult
  
  // Check if user is admin (simplified for now, will use JSON DB in Stage 1.3)
  // For now, we'll skip the admin check and implement it in Stage 1.3
  // when we have the JSON database operations ready
  
  return { userId }
}

/**
 * Wrapper function to apply auth middleware to API routes
 */
export function withAuth(handler: (req: NextRequest, context: { userId: string }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const authResult = await requireAuthAPI(req)
    
    if ('status' in authResult) {
      return authResult
    }
    
    return handler(req, authResult)
  }
}

/**
 * Wrapper function to apply admin middleware to API routes
 */
export function withAdmin(handler: (req: NextRequest, context: { userId: string }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const authResult = await requireAdminAPI(req)
    
    if ('status' in authResult) {
      return authResult
    }
    
    return handler(req, authResult)
  }
}

 