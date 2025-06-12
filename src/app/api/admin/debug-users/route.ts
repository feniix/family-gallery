import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getIsAdmin } from '@/lib/server-auth';
import { usersDb, withRetry } from '@/lib/json-db';
import type { UsersData } from '@/types/media';
import { authLogger } from '@/lib/logger'

export async function GET() {
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

    authLogger.info('Complete user database debug analysis')

    const analysis = {
      totalUsers: users.length,
      users: users.map(([userId, userData]) => ({
        userId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status,
        created: userData.created,
        approvedBy: userData.approvedBy,
        approvedAt: userData.approvedAt
      })),
      duplicateEmails: {} as Record<string, Array<{ userId: string; name: string; created: string; approvedBy?: string }>>
    };

    // Group by email to find duplicates
    const emailGroups: Record<string, Array<{ userId: string; name: string; created: string; approvedBy?: string }>> = {};
    for (const [userId, userData] of users) {
      if (!emailGroups[userData.email]) {
        emailGroups[userData.email] = [];
      }
      emailGroups[userData.email].push({
        userId,
        name: userData.name,
        created: userData.created,
        approvedBy: userData.approvedBy
      });
    }

    // Find duplicates
    for (const [email, emailUsers] of Object.entries(emailGroups)) {
      if (emailUsers.length > 1) {
        analysis.duplicateEmails[email] = emailUsers;
        authLogger.warn('Duplicate email found', { email })
        emailUsers.forEach((user, index) => {
          authLogger.debug('Duplicate user details', { 
            index: index + 1,
            userId: user.userId, 
            name: user.name, 
            created: user.created 
          })
        });
      }
    }

    return NextResponse.json(analysis);

  } catch (error) {
    authLogger.error('Error debugging users', { error })
    return NextResponse.json(
      { error: 'Failed to debug users' },
      { status: 500 }
    );
  }
} 