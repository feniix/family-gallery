import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getIsAdmin } from '@/lib/server-auth';
import { usersDb, withRetry } from '@/lib/json-db';
import type { UsersData } from '@/types/media';
import { authLogger } from '@/lib/logger'

export async function POST() {
  try {
    // Check authentication and admin status
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await getIsAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get users from database
    const usersData: UsersData = await withRetry(() => usersDb.read());
    const users = Object.entries(usersData.users);

    // Find duplicates for feniix@gmail.com
    const targetEmail = 'feniix@gmail.com';
          const duplicateUsers = users.filter(([, userData]) => userData.email === targetEmail);
    
    authLogger.info('Found duplicate users for cleanup', { 
      email: targetEmail, 
      count: duplicateUsers.length 
    })
    
    if (duplicateUsers.length <= 1) {
      return NextResponse.json({ 
        message: 'No duplicates found',
        users: duplicateUsers.map(([id, data]) => ({ id, name: data.name, created: data.created }))
      });
    }

    // Keep the newer one with the proper name ("Sebastian Otaegui")
    // Remove the older one with generic name ("feniix")
    let removedCount = 0;
    const keptUsers: Array<{ id: string; name: string; created: string }> = [];
    const removedUsers: Array<{ id: string; name: string; created: string }> = [];

    for (const [userId, userData] of duplicateUsers) {
      if (userData.provider === 'bootstrap' || userData.name === 'test') {
        delete usersData.users[userId]
        authLogger.info('Removed duplicate user', { 
          userId, 
          name: userData.name 
        })
        removedUsers.push({ id: userId, name: userData.name, created: userData.created });
        removedCount++;
      } else {
        authLogger.info('Kept user', { 
          userId, 
          name: userData.name 
        })
        keptUsers.push({ id: userId, name: userData.name, created: userData.created });
      }
    }

    // Save updated database
    await withRetry(() => usersDb.write(usersData));

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${removedCount} duplicate user(s) for ${targetEmail}`,
      keptUsers,
      removedUsers,
      totalProcessed: duplicateUsers.length
    });

  } catch (error) {
    authLogger.error('Error cleaning up duplicate users', { error })
    return NextResponse.json({ error: 'Failed to cleanup users' }, { status: 500 })
  }
} 