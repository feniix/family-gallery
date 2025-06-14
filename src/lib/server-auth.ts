import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { usersDb, withRetry } from '@/lib/json-db'
import type { UsersData } from '@/types/media'
import { authLogger } from './logger'

/**
 * Server-side function to check if current user is an admin
 */
export async function getIsAdmin(): Promise<boolean> {
  const user = await currentUser()
  
  if (!user?.id) {
    return false
  }

  // First check if admin by email (for initial setup)
  if (user.primaryEmailAddress?.emailAddress && isAdminEmail(user.primaryEmailAddress.emailAddress)) {
    return true
  }

  // Then check database role
  try {
    const usersData: UsersData = await withRetry(() => usersDb.read())
    const dbUser = usersData.users[user.id]
    return dbUser?.role === 'admin'
  } catch (error) {
    authLogger.error('Error checking admin status from database', { error })
    return false
  }
}

/**
 * Server-side function to get current user role from database
 */
export async function getCurrentUserRole(): Promise<'admin' | 'family' | 'extended-family' | 'friend' | 'guest' | null> {
  const user = await currentUser()
  
  if (!user?.primaryEmailAddress?.emailAddress) {
    return null
  }

  // Check if admin by email first
  if (isAdminEmail(user.primaryEmailAddress.emailAddress)) {
    return 'admin'
  }

  // Get role from database
  try {
    const usersData: UsersData = await withRetry(() => usersDb.read())
    const dbUser = usersData.users[user.id]
    return dbUser?.role || 'guest'
  } catch (error) {
    authLogger.error('Error fetching user role from database', { error })
    return 'guest'
  }
}

/**
 * Server-side function to get current user data from database
 */
export async function getCurrentUserData() {
  const user = await currentUser()
  
  if (!user?.id) {
    return null
  }

  try {
    const usersData: UsersData = await withRetry(() => usersDb.read())
    return usersData.users[user.id] || null
  } catch (error) {
    authLogger.error('Error fetching user data from database', { error })
    return null
  }
}

/**
 * Server-side function to check if current user has access to content
 */
export async function getCurrentUserHasAccess(): Promise<boolean> {
  const userData = await getCurrentUserData()
  
  if (!userData) {
    return false
  }

  // Admins always have access
  if (userData.role === 'admin') {
    return true
  }

  // Users must be approved and not be guests
  return userData.status === 'approved' && userData.role !== 'guest'
}

/**
 * Server-side function to require admin access (redirects if not admin)
 */
export async function requireAdmin() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const isAdmin = await getIsAdmin()
  if (!isAdmin) {
    redirect('/gallery') // Redirect non-admins to gallery
  }
}

/**
 * Server-side function to require authentication (redirects if not authenticated)
 */
export async function requireAuth() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return userId
}

// Re-export from consolidated location
import { isAdminEmail } from '@/lib/utils'
export { isAdminEmail }

/**
 * Get user role based on email
 */
export function getUserRole(userEmail: string): 'admin' | 'guest' {
  return isAdminEmail(userEmail) ? 'admin' : 'guest'
}

/**
 * Check if user has access to content using auth result from middleware
 */
export async function checkUserHasAccessFromAuth(authResult: { userId: string | null }): Promise<boolean> {
  if (!authResult?.userId) {
    return false
  }

  try {
    const usersData: UsersData = await withRetry(() => usersDb.read())
    const userData = usersData.users[authResult.userId]
    
    if (!userData) {
      return false
    }

    // Admins always have access
    if (userData.role === 'admin') {
      return true
    }

    // Users must be approved and not be guests
    return userData.status === 'approved' && userData.role !== 'guest'
  } catch (error) {
    authLogger.error('Error checking user access from auth', { error })
    return false
  }
}

/**
 * Check if user is admin by email from Clerk user object
 */
export function checkIsAdminFromEmail(email: string): boolean {
  return isAdminEmail(email)
}

/**
 * Smart access check: Check admin email first, then database
 */
export async function checkUserHasAccessSmart(authResult?: { userId: string | null }): Promise<boolean> {
  try {
    const userId = authResult?.userId

    if (!userId) {
      authLogger.debug('No userId provided for access check')
      return false
    }

    authLogger.debug('Checking user access', {
      userId,
      userEmail: undefined,
      adminEmailsEnv: process.env.ADMIN_EMAILS,
      publicAdminEmailsEnv: process.env.NEXT_PUBLIC_ADMIN_EMAILS
    })

    // Check database first
    const usersData: UsersData = await withRetry(() => usersDb.read())
    const userData = usersData.users[userId]
    if (userData) {
      authLogger.debug('Found user in database', { 
        role: userData.role, 
        status: userData.status, 
        email: userData.email 
      })

      if (userData.role === 'admin') {
        authLogger.debug('User is admin in database')
        return true
      }

      // For non-admin users, we can use their email from the database
      const userEmail = userData.email
      if (userEmail) {
        authLogger.debug('Using email from database', { userEmail })
        
        // Check if user has admin email
        if (isAdminEmail(userEmail)) {
          authLogger.debug('User has admin email in database')
          return true
        }
      }

      // User exists in database but is not admin
      const hasAccess = userData.status === 'approved'
      authLogger.debug('Database access check result', { 
        role: userData.role, 
        status: userData.status, 
        hasAccess 
      })
      return hasAccess
    } else {
      authLogger.debug('No user data found in database')
      
      // User is not in database yet (first time)
      // Try to create the user automatically
      try {
        const user = await currentUser()
        if (user?.primaryEmailAddress?.emailAddress) {
          const { createUser } = await import('@/lib/users')
          const { usersDb, withRetry } = await import('@/lib/json-db')
          
          const newUser = createUser({
            id: userId,
            email: user.primaryEmailAddress.emailAddress,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.primaryEmailAddress.emailAddress.split('@')[0],
            provider: 'clerk'
          })
          
          // Add to database
          const usersData = await withRetry(() => usersDb.read())
          usersData.users[userId] = newUser
          await withRetry(() => usersDb.write(usersData))
          
          authLogger.info('Auto-created user in database', {
            userId,
            email: user.primaryEmailAddress.emailAddress,
            role: newUser.role,
            status: newUser.status
          })
          
          // Return access based on the newly created user
          if (newUser.role === 'admin') {
            return true
          }
          return newUser.status === 'approved'
        }
      } catch (error) {
        authLogger.error('Failed to auto-create user', { error })
      }
      
      authLogger.warn('User not in database and auto-creation failed')
    }
  } catch (error) {
    authLogger.error('Database error during access check', { error })
  }

  // Final fallback: check if user is admin by email (for webhook auto-creation)
  try {
    const user = await currentUser()
    if (user?.emailAddresses?.[0]?.emailAddress && isAdminEmail(user.emailAddresses[0].emailAddress)) {
      authLogger.debug('User is admin by email (fallback check)')
      return true
    }
  } catch (error) {
    authLogger.error('Error checking user access from auth', { error })
  }

  authLogger.debug('No access granted - not in database and not admin email')
  return false
}

 