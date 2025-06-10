import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

/**
 * Server-side function to check if current user is an admin
 */
export async function getIsAdmin(): Promise<boolean> {
  const user = await currentUser()
  
  if (!user?.primaryEmailAddress?.emailAddress) {
    return false
  }

  return isAdminEmail(user.primaryEmailAddress.emailAddress)
}

/**
 * Server-side function to get current user role
 */
export async function getCurrentUserRole(): Promise<'admin' | 'user' | null> {
  const user = await currentUser()
  
  if (!user?.primaryEmailAddress?.emailAddress) {
    return null
  }

  return getUserRole(user.primaryEmailAddress.emailAddress)
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

/**
 * Check if an email address should be an admin
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(email)
}

/**
 * Get user role based on email
 */
export function getUserRole(userEmail: string): 'admin' | 'user' {
  return isAdminEmail(userEmail) ? 'admin' : 'user'
} 