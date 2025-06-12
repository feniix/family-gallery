import { useUser } from '@clerk/nextjs'
import { isAdminEmail } from '@/lib/utils'

/**
 * Client-side hook to check if current user is an admin
 */
export function useIsAdmin() {
  const { user, isLoaded } = useUser()
  
  if (!isLoaded || !user) {
    return false
  }

  return isAdminEmail(user.primaryEmailAddress?.emailAddress || '')
}

// Re-export from consolidated location
export { isAdminEmail } 