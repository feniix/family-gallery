import { useUser } from '@clerk/nextjs'

/**
 * Client-side hook to check if current user is an admin
 */
export function useIsAdmin() {
  const { user, isLoaded } = useUser()
  
  if (!isLoaded || !user) {
    return false
  }

  // Check if user email is in admin list
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(user.primaryEmailAddress?.emailAddress || '')
}

/**
 * Client-side function to get user role
 */
export function getUserRole(userEmail: string): 'admin' | 'user' {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(userEmail) ? 'admin' : 'user'
}

/**
 * Check if an email address should be an admin
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(email)
}

/**
 * Server-side function to check if current user is admin
 * Used in API routes and server components
 */
export function getIsAdmin(userEmail?: string): boolean {
  if (!userEmail) return false
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(userEmail)
} 