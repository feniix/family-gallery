import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getIsAdmin } from '@/lib/server-auth'
import { usersDb, withRetry } from '@/lib/json-db'
import type { UsersData } from '@/types/media'
import { apiLogger } from '@/lib/logger'

export async function GET() {
  try {
    // Check authentication and admin status
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await getIsAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all users from database
    const usersData: UsersData = await withRetry(() => usersDb.read())
    const users = Object.values(usersData.users)

    // Calculate statistics
    const stats = {
      total: users.length,
      byRole: users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byStatus: users.reduce((acc, user) => {
        acc[user.status] = (acc[user.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      pendingApprovals: users.filter(user => user.status === 'pending').length,
      recentSignups: users.filter(user => {
        const userCreated = new Date(user.created)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return userCreated >= weekAgo
      }).length
    }

    apiLogger.info('User stats requested', { 
      userId, 
      totalUsers: stats.total,
      pendingApprovals: stats.pendingApprovals,
      recentSignups: stats.recentSignups
    })

    return NextResponse.json(stats)

  } catch (error) {
    apiLogger.error('Error fetching user statistics', { 
      error: error instanceof Error ? error.message : error 
    })
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
} 