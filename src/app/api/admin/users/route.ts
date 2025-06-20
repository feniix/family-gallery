import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getIsAdmin } from '@/lib/server-auth';
import { usersDb, withRetry } from '@/lib/json-db';
import { approveUser, promoteUser, suspendUser, userHasAccess } from '@/lib/users';
import { apiLogger } from '@/lib/logger';
import type { UsersData, UserData } from '@/types/media';

/**
 * GET /api/admin/users
 * Get all users with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await getIsAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'suspended'
    const role = searchParams.get('role'); // Filter by role

    // Get users from database
    const usersData: UsersData = await withRetry(() => usersDb.read());
    let users = Object.values(usersData.users);

    // Apply filters
    if (status && status !== 'all') {
      users = users.filter(user => user.status === status);
    }
    if (role) {
      users = users.filter(user => user.role === role);
    }

    // Sort by creation date (newest first)
    users.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    apiLogger.info('Users list requested', { 
      userId, 
      totalUsers: users.length,
      filters: { status, role }
    });

    return NextResponse.json({
      users: users.map(user => ({
        ...user,
        hasAccess: userHasAccess(user)
      }))
    });

  } catch (error) {
    apiLogger.error('Error fetching users', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Admin operations on users (approve, promote, suspend)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin status
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await getIsAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, targetUserId, role } = body;

    if (!action || !targetUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current admin info
    const currentUserInfo = await currentUser();
    const adminEmail = currentUserInfo?.primaryEmailAddress?.emailAddress || 'unknown';

    // Get users from database
    const usersData: UsersData = await withRetry(() => usersDb.read());
    const targetUser = usersData.users[targetUserId];

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let updatedUser: UserData;

    switch (action) {
      case 'approve':
        updatedUser = approveUser(targetUser, adminEmail);
        break;
      
      case 'promote':
        if (!role || !['admin', 'family', 'extended-family', 'friend', 'guest'].includes(role)) {
          return NextResponse.json({ error: 'Invalid role for promotion' }, { status: 400 });
        }
        
        // Handle admin role specially since promoteUser doesn't support it
        if (role === 'admin') {
          updatedUser = {
            ...targetUser,
            role: 'admin',
            approved: true,
            approvedBy: adminEmail,
            approvedAt: new Date().toISOString(),
            status: 'approved'
          };
        } else if (role === 'guest') {
          // Handle guest role - guests are approved but have no content access
          updatedUser = {
            ...targetUser,
            role: 'guest',
            approved: true,
            approvedBy: adminEmail,
            approvedAt: new Date().toISOString(),
            status: 'approved'
          };
        } else {
          // Use promoteUser for family, extended-family, friend
          updatedUser = promoteUser(targetUser, role as 'family' | 'extended-family' | 'friend', adminEmail);
        }
        break;
      
      case 'suspend':
        updatedUser = suspendUser(targetUser);
        break;
      
      case 'delete':
        // Prevent self-deletion
        if (targetUserId === userId) {
          return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }
        
        // Delete user from database
        delete usersData.users[targetUserId];
        await withRetry(() => usersDb.write(usersData));

        apiLogger.info('User deleted', {
          adminUserId: userId,
          adminEmail,
          deletedUserId: targetUserId,
          deletedUserEmail: targetUser.email
        });

        return NextResponse.json({
          success: true,
          message: 'User deleted successfully',
          deletedUser: {
            id: targetUserId,
            email: targetUser.email,
            name: targetUser.name
          }
        });
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Save updated user to database
    usersData.users[targetUserId] = updatedUser;
    await withRetry(() => usersDb.write(usersData));

    apiLogger.info('User management action completed', {
      adminUserId: userId,
      adminEmail,
      action,
      targetUserId,
      targetUserEmail: targetUser.email,
      newRole: updatedUser.role,
      newStatus: updatedUser.status
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        hasAccess: userHasAccess(updatedUser)
      }
    });

  } catch (error) {
    apiLogger.error('Error in user management action', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to perform user action' },
      { status: 500 }
    );
  }
} 