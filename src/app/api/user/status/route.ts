import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { usersDb, withRetry } from '@/lib/json-db';
import { userHasAccess } from '@/lib/users';
import { apiLogger } from '@/lib/logger';
import type { UsersData } from '@/types/media';

/**
 * GET /api/user/status
 * Get current user's status (non-admin endpoint)
 */
export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user?.primaryEmailAddress?.emailAddress) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Get user from database
    const usersData: UsersData = await withRetry(() => usersDb.read());
    const userData = usersData.users[userId];

    if (!userData) {
      // User not in database yet - return default pending status
      apiLogger.debug('User not found in database, returning default status', { userId });
      return NextResponse.json({
        user: {
          id: userId,
          email: user.primaryEmailAddress.emailAddress,
          role: 'guest',
          status: 'pending',
          approved: false,
          hasAccess: false,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.primaryEmailAddress.emailAddress.split('@')[0]
        }
      });
    }

    apiLogger.debug('User status requested', { 
      userId, 
      role: userData.role,
      status: userData.status
    });

    return NextResponse.json({
      user: {
        ...userData,
        hasAccess: userHasAccess(userData)
      }
    });

  } catch (error) {
    apiLogger.error('Error fetching user status', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch user status' },
      { status: 500 }
    );
  }
} 