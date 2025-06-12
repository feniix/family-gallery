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
 * Check if an email address should be an admin
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(email)
} 