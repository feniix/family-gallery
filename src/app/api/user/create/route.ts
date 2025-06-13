import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { usersDb, withRetry } from '@/lib/json-db';
import { createUser } from '@/lib/users';
import { apiLogger } from '@/lib/logger';
import type { UsersData } from '@/types/media';

/**
 * POST /api/user/create
 * Create a user entry in the database for a new user
 */
export async function POST() {
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

    const email = user.primaryEmailAddress.emailAddress;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0];

    // Check if user already exists in database
    const usersData: UsersData = await withRetry(() => usersDb.read());
    if (usersData.users[userId]) {
      apiLogger.debug('User already exists in database', { userId, email });
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        user: usersData.users[userId]
      });
    }

    // Create new user entry
    const newUser = createUser({
      id: userId,
      email: email,
      name: name,
      provider: 'clerk'
    });

    // Add user to database
    usersData.users[userId] = newUser;
    await withRetry(() => usersDb.write(usersData));

    apiLogger.info('Created new user in database', {
      userId,
      email,
      role: newUser.role,
      status: newUser.status
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    apiLogger.error('Error creating user', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 