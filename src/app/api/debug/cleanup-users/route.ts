import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getIsAdmin } from '@/lib/server-auth';
import { usersDb, withRetry } from '@/lib/json-db';
import type { UsersData } from '@/types/media';
import { authLogger } from '@/lib/logger';

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

    authLogger.info('Users database analysis', {
      totalUsers: users.length
    });

    const analysis = {
      totalUsers: users.length,
      users: [] as Array<{ userId: string; email: string; name: string; role: string; status: string; created: string; approvedBy?: string }>,
      duplicateEmails: {} as Record<string, Array<{ userId: string; email: string; name: string; role: string; status: string; created: string; approvedBy?: string }>>,
      summary: {
        hasDuplicates: false,
        duplicateCount: 0,
        duplicateEmails: [] as string[]
      }
    };

    // Analyze all users
    const emailGroups: Record<string, Array<{ userId: string; email: string; name: string; role: string; status: string; created: string; approvedBy?: string }>> = {};
    
    for (const [userId, userData] of users) {
      const userInfo = {
        userId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status,
        created: userData.created,
        approvedBy: userData.approvedBy
      };
      
      analysis.users.push(userInfo);
      
      // Group by email
      if (!emailGroups[userData.email]) {
        emailGroups[userData.email] = [];
      }
      emailGroups[userData.email].push(userInfo);
    }

    // Find duplicates
    for (const [email, emailUsers] of Object.entries(emailGroups)) {
      if (emailUsers.length > 1) {
        analysis.duplicateEmails[email] = emailUsers;
        analysis.summary.hasDuplicates = true;
        analysis.summary.duplicateCount += emailUsers.length;
        analysis.summary.duplicateEmails.push(email);
      }
    }

    return NextResponse.json(analysis);

  } catch (error) {
    authLogger.error('Error analyzing users', { error });
    return NextResponse.json(
      { error: 'Failed to analyze users' },
      { status: 500 }
    );
  }
}

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
    const { action, email } = body;

    if (action !== 'cleanup' || !email) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get users from database
    const usersData: UsersData = await withRetry(() => usersDb.read());
    const users = Object.entries(usersData.users);

    // Find users with the specified email
    const duplicateUsers = users.filter(([, userData]) => userData.email === email);
    
    if (duplicateUsers.length <= 1) {
      return NextResponse.json({ error: 'No duplicates found for this email' }, { status: 400 });
    }

    // Keep the most recent user (by creation date) or the one with more complete data
    const userToKeep = duplicateUsers.reduce((best, current) => {
      const [, currentData] = current;
      const [, bestData] = best;
      
      // Prefer the one with the most recent creation date
      if (new Date(currentData.created) > new Date(bestData.created)) {
        return current;
      }
      
      // If same date, prefer the one with more complete name
      if (currentData.created === bestData.created) {
        if (currentData.name && currentData.name.length > bestData.name.length) {
          return current;
        }
      }
      
      return best;
    });

    const [keepUserId, keepUserData] = userToKeep;

    // Remove duplicate users (keep only the selected one)
    for (const [userId, userData] of duplicateUsers) {
      if (userId !== keepUserId) {
        delete usersData.users[userId];
        authLogger.info('Removed duplicate user', { 
          userId, 
          email: userData.email 
        });
      }
    }

    // Save updated database
    await withRetry(() => usersDb.write(usersData));

    return NextResponse.json({
      success: true,
      message: `Cleaned up duplicates for ${email}`,
      keptUser: {
        userId: keepUserId,
        email: keepUserData.email,
        name: keepUserData.name,
        created: keepUserData.created
      },
      removedCount: duplicateUsers.length - 1
    });

  } catch (error) {
    authLogger.error('Error cleaning up users', { error });
    return NextResponse.json(
      { error: 'Failed to cleanup users' },
      { status: 500 }
    );
  }
} 