import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getCurrentUserRole } from '@/lib/server-auth'
import { apiLogger } from '@/lib/logger'

/**
 * GET /api/auth/user-role
 * Get current user's role from database
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    const userEmail = user?.primaryEmailAddress?.emailAddress

    const role = await getCurrentUserRole()
    
    apiLogger.debug('User role check', { 
      userId, 
      userEmail, 
      role 
    })

    return NextResponse.json({ 
      role: role || 'guest',
      userId,
      email: userEmail
    })

  } catch (error) {
    apiLogger.error('Error fetching user role', { 
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch user role' },
      { status: 500 }
    )
  }
} 