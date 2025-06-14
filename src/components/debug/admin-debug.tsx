'use client'

import { useUser } from '@clerk/nextjs'
import { useIsAdmin } from '@/lib/auth'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isAdminEmail } from '@/lib/utils'

export function AdminDebug() {
  const { user, isLoaded } = useUser()
  const isAdmin = useIsAdmin()
  const [dbRole, setDbRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/user-role')
        if (response.ok) {
          const data = await response.json()
          setDbRole(data.role)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isLoaded) {
      fetchUserRole()
    }
  }, [user, isLoaded])

  if (!isLoaded || loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Not signed in</div>
  }

  const userEmail = user.primaryEmailAddress?.emailAddress
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
  const isAdminByEmail = isAdminEmail(userEmail || '')

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Admin Debug Information</CardTitle>
        <CardDescription>Debug information for admin access issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>User ID:</strong> {user.id}
        </div>
        <div>
          <strong>User Email:</strong> {userEmail || 'No email'}
        </div>
        <div>
          <strong>Database Role:</strong> <Badge variant={dbRole === 'admin' ? 'default' : 'secondary'}>{dbRole || 'Unknown'}</Badge>
        </div>
        <div>
          <strong>Is Admin by Email:</strong> <Badge variant={isAdminByEmail ? 'default' : 'destructive'}>{isAdminByEmail ? 'Yes' : 'No'}</Badge>
        </div>
        <div>
          <strong>Is Admin (Final Hook Result):</strong> <Badge variant={isAdmin ? 'default' : 'destructive'}>{isAdmin ? 'Yes' : 'No'}</Badge>
        </div>
        <div>
          <strong>Admin Emails (ENV):</strong>
          <ul className="list-disc list-inside ml-4">
            {adminEmails.map((email, index) => (
              <li key={index} className={userEmail === email ? 'font-bold text-green-600' : ''}>
                {email} {userEmail === email && '← Current User'}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>All User Emails:</strong>
          <ul className="list-disc list-inside ml-4">
            {user.emailAddresses.map((email, index) => (
              <li key={index}>
                {email.emailAddress} {email.id === user.primaryEmailAddress?.id && '(Primary)'}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 