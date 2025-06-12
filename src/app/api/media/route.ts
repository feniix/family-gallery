import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, usersDb, addYearToIndex, removeYearFromIndex, updateIndexMediaCount, withRetry } from '@/lib/json-db';
import { getIsAdmin } from '@/lib/server-auth';
import type { MediaMetadata, UsersData } from '@/types/media';
import { apiLogger } from '@/lib/logger';

/**
 * Check if user is admin by userId and optional email
 */
async function isAdmin(userId: string, userEmail?: string): Promise<boolean> {
  try {
    // First try the server-auth method which uses currentUser() 
    const isAdminFromAuth = await getIsAdmin();
    if (isAdminFromAuth) {
      return true;
    }
    
    // Check against environment variable admin emails (same as client-side)
    if (userEmail) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
      if (adminEmails.includes(userEmail)) {
        return true;
      }
    }
    
    // Fallback to database check
    const users: UsersData = await usersDb.read();
    const dbUser = users.users[userId];
    return dbUser?.role === 'admin';
    
  } catch (error) {
    apiLogger.error('Error checking admin status', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

/**
 * GET /api/media
 * Retrieve media metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    // Get media for the specified year
    const mediaDb = getMediaDb(parseInt(year));
    const mediaData = await withRetry(() => mediaDb.read());

    // Apply pagination
    const allMedia = mediaData.media || [];
    const paginatedMedia = allMedia.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      media: paginatedMedia,
      total: allMedia.length,
      year: parseInt(year),
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < allMedia.length,
      },
    });

  } catch (error) {
    apiLogger.error('Error retrieving media', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Failed to retrieve media' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media
 * Add new media metadata (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!(await isAdmin(userId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const mediaData: MediaMetadata = body;

    // Validate required fields
    if (!mediaData.id || !mediaData.filename || !mediaData.path || !mediaData.type) {
      return NextResponse.json(
        { error: 'Missing required fields: id, filename, path, type' },
        { status: 400 }
      );
    }

    // Determine year from takenAt date
    const takenAtDate = new Date(mediaData.takenAt);
    const year = takenAtDate.getFullYear();
    
    apiLogger.debug(`Saving media to year database`, { 
      year,
      filename: mediaData.originalFilename,
      mediaId: mediaData.id,
      type: mediaData.type
    });

    // Add to media database for the year
    const mediaDb = getMediaDb(year);
    const updatedData = await withRetry(() =>
      mediaDb.update((current) => {
        apiLogger.debug(`Current year database status`, { 
          year, 
          fileCountBefore: current.media.length 
        });
        
        // Check for duplicates
        const existingIndex = current.media.findIndex(m => m.id === mediaData.id);
        
        if (existingIndex !== -1) {
          apiLogger.debug(`Updated existing file at index`, { year, index: existingIndex, filename: mediaData.originalFilename });
          // Update existing
          current.media[existingIndex] = mediaData;
        } else {
          apiLogger.debug(`Added new file to year database`, { year, filename: mediaData.originalFilename });
          // Add new
          current.media.push(mediaData);
        }

        // Sort by takenAt date (newest first)
        current.media.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());

        apiLogger.info(`Year database updated successfully`, { 
          year, 
          totalFiles: current.media.length,
          filename: mediaData.originalFilename
        });

        return current;
      })
    );
    
    // Add year to media index
    await addYearToIndex(year);
    apiLogger.debug(`Added year to media index`, { year });

    // Update total media count in index (optional - can be done periodically)
    await updateIndexMediaCount();
    apiLogger.debug(`Updated media index total count`);

    return NextResponse.json({
      success: true,
      message: 'Media metadata saved successfully',
      year,
      totalMedia: updatedData.media.length,
    });

  } catch (error) {
    apiLogger.error('Error saving media metadata', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Failed to save media metadata' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media
 * Delete media metadata (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!(await isAdmin(userId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const mediaId = url.searchParams.get('id');
    const year = url.searchParams.get('year');

    if (!mediaId || !year) {
      return NextResponse.json(
        { error: 'Media ID and year parameters are required' },
        { status: 400 }
      );
    }

    // Remove from media database
    const mediaDb = getMediaDb(parseInt(year));
    const updatedData = await withRetry(() =>
      mediaDb.update((current) => {
        current.media = current.media.filter(m => m.id !== mediaId);
        return current;
      })
    );

    // If this year now has no media, remove it from the index
    if (updatedData.media.length === 0) {
      await removeYearFromIndex(parseInt(year));
      apiLogger.info(`Removed year from index (no media left)`, { year });
    }

    // Update total media count in index
    await updateIndexMediaCount();
    apiLogger.debug(`Updated media index total count after deletion`);

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
      totalMedia: updatedData.media.length,
    });

  } catch (error) {
    apiLogger.error('Error deleting media', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
} 