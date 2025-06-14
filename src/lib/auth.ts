import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { isAdminEmail } from '@/lib/utils'

/**
 * Client-side hook to check if current user is an admin
 * Checks database role first, then falls back to email checking
 */
export function useIsAdmin() {
  const { user, isLoaded } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkAdminStatus() {
      if (!isLoaded || !user) {
        setIsAdmin(false)
        setIsChecking(false)
        return
      }

      try {
        // First check database role via API
        const response = await fetch('/api/auth/user-role', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.role === 'admin')
        } else {
          // Fallback to email checking if API fails
          setIsAdmin(isAdminEmail(user.primaryEmailAddress?.emailAddress || ''))
        }
      } catch {
        // Fallback to email checking if API fails
        setIsAdmin(isAdminEmail(user.primaryEmailAddress?.emailAddress || ''))
      } finally {
        setIsChecking(false)
      }
    }

    checkAdminStatus()
  }, [user, isLoaded])

  if (!isLoaded || isChecking) {
    return false
  }

  return isAdmin
}

// Re-export from consolidated location
export { isAdminEmail } 