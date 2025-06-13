import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { usersDb, withRetry } from '@/lib/json-db'
import { isAdminEmail } from '@/lib/server-auth'
import type { UsersData, UserData } from '@/types/media'
import { authLogger } from '@/lib/logger'

export async function POST() {
  try {
    // Get current user from Clerk (this works in API routes)
    const user = await currentUser()
    
    if (!user?.primaryEmailAddress?.emailAddress) {
      return NextResponse.json({ error: 'No user or email found' }, { status: 400 })
    }

    const email = user.primaryEmailAddress.emailAddress
    const userId = user.id

    authLogger.debug('Auto-create admin check', { userId, email })

    // Check if user is admin
    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: 'Not an admin email' }, { status: 403 })
    }

    // Check if user already exists
    const usersData: UsersData = await withRetry(() => usersDb.read())
    if (usersData.users[userId]) {
      return NextResponse.json({ 
        message: 'User already exists',
        user: usersData.users[userId]
      })
    }

    // Create admin user
    const newUserData: UserData = {
      id: userId,
      email: email,
      role: 'admin',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0],
      provider: 'clerk',
      created: new Date().toISOString(),
      approved: true,
      approvedBy: 'auto-admin-creation',
      approvedAt: new Date().toISOString(),
      status: 'approved',
    }

    // Add user to database
    usersData.users[userId] = newUserData
    await withRetry(() => usersDb.write(usersData))

    authLogger.info('Auto-created admin user', { email, role: 'admin' })

    return NextResponse.json({ 
      success: true,
      message: 'Admin user created successfully',
      user: newUserData
    })
  } catch (error) {
    authLogger.error('Error auto-creating admin user', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 