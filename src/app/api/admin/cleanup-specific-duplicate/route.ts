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

    // Remove the specific bootstrap user
    const bootstrapUserId = "bootstrap-feniix-at-gmail-com-1749695788521";
    const realUserId = "user_2yIQRDIKOMFnnktHBGQV4SaHiOi";

    if (!usersData.users[bootstrapUserId]) {
      return NextResponse.json({ 
        error: 'Bootstrap user not found',
        availableUsers: Object.keys(usersData.users)
      });
    }

    if (!usersData.users[realUserId]) {
      return NextResponse.json({ 
        error: 'Real user not found',
        availableUsers: Object.keys(usersData.users)
      });
    }

    // Get the data before removal
    const removedUser = usersData.users[bootstrapUserId];
    const keptUser = usersData.users[realUserId];

    // Remove the bootstrap user
    delete usersData.users[bootstrapUserId];

    // Save updated database
    await withRetry(() => usersDb.write(usersData));

    authLogger.info('Removed bootstrap user', { 
      userId: bootstrapUserId, 
      name: removedUser.name 
    })
    authLogger.info('Kept real user', { 
      userId: realUserId, 
      name: keptUser.name 
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully removed bootstrap duplicate user',
      removedUser: {
        userId: bootstrapUserId,
        name: removedUser.name,
        created: removedUser.created,
        approvedBy: removedUser.approvedBy
      },
      keptUser: {
        userId: realUserId,
        name: keptUser.name,
        created: keptUser.created,
        approvedBy: keptUser.approvedBy
      }
    });

  } catch (error) {
    authLogger.error('Error cleaning up specific duplicate user', { error })
    return NextResponse.json({ error: 'Failed to cleanup users' }, { status: 500 })
  }
} 