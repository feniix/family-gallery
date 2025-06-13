import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getIsAdmin } from '@/lib/server-auth'
import { usersDb, withRetry } from '@/lib/json-db'
import { approveUser, promoteUser, suspendUser } from '@/lib/users'
import { apiLogger } from '@/lib/logger'
import type { UsersData, UserData } from '@/types/media'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin status
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await getIsAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const user = await currentUser()
    const adminEmail = user?.primaryEmailAddress?.emailAddress

    // Parse request body
    const { userIds, action, role } = await request.json()

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 })
    }

    if (!['approve', 'suspend', 'change-role', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (action === 'change-role' && !role) {
      return NextResponse.json({ error: 'Role is required for change-role action' }, { status: 400 })
    }

    // Read users from database
    const usersData: UsersData = await withRetry(() => usersDb.read())
    let processed = 0
    const results: Array<{ userId: string; success: boolean; error?: string }> = []

    // Process each user
    for (const targetUserId of userIds) {
      try {
        const targetUser = usersData.users[targetUserId]
        if (!targetUser) {
          results.push({ userId: targetUserId, success: false, error: 'User not found' })
          continue
        }

        // Prevent self-modification for certain actions
        if (targetUserId === userId && (action === 'suspend' || action === 'change-role' || action === 'delete')) {
          results.push({ userId: targetUserId, success: false, error: 'Cannot modify your own account' })
          continue
        }

        let updatedUser: UserData

        switch (action) {
          case 'approve':
            updatedUser = approveUser(targetUser, adminEmail || 'bulk-admin')
            break
          case 'suspend':
            updatedUser = suspendUser(targetUser)
            break
          case 'change-role':
            if (!['admin', 'family', 'extended-family', 'friend', 'guest'].includes(role)) {
              results.push({ userId: targetUserId, success: false, error: 'Invalid role' })
              continue
            }
            // Handle admin and guest roles specially since promoteUser doesn't support them
            if (role === 'admin') {
              updatedUser = {
                ...targetUser,
                role: 'admin',
                approved: true,
                approvedBy: adminEmail || 'bulk-admin',
                approvedAt: new Date().toISOString(),
                status: 'approved'
              }
            } else if (role === 'guest') {
              updatedUser = {
                ...targetUser,
                role: 'guest',
                approved: true,
                approvedBy: adminEmail || 'bulk-admin',
                approvedAt: new Date().toISOString(),
                status: 'approved'
              }
            } else {
              // Use promoteUser for family, extended-family, friend
              updatedUser = promoteUser(targetUser, role as 'family' | 'extended-family' | 'friend', adminEmail || 'bulk-admin')
            }
            break
          case 'delete':
            // Delete user from database
            delete usersData.users[targetUserId]
            processed++
            results.push({ userId: targetUserId, success: true })
            continue // Skip the update step since we deleted the user
          default:
            results.push({ userId: targetUserId, success: false, error: 'Invalid action' })
            continue
        }

        // Update user in database
        usersData.users[targetUserId] = updatedUser
        processed++
        results.push({ userId: targetUserId, success: true })

      } catch (error) {
        results.push({ 
          userId: targetUserId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Save updated users back to database
    if (processed > 0) {
      await withRetry(() => usersDb.write(usersData))
    }

    apiLogger.info('Bulk user action completed', {
      adminUserId: userId,
      adminEmail,
      action,
      role,
      totalUsers: userIds.length,
      processed,
      failed: userIds.length - processed
    })

    return NextResponse.json({
      success: true,
      processed,
      total: userIds.length,
      results
    })

  } catch (error) {
    apiLogger.error('Error in bulk user action', { 
      error: error instanceof Error ? error.message : error 
    })
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    )
  }
} 