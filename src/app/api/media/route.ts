import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, usersDb } from '@/lib/json-db';
import { withRetry } from '@/lib/json-db';
import { getIsAdmin } from '@/lib/server-auth';
import type { MediaMetadata, UsersData } from '@/types/media';

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
    console.error('Error checking admin status:', error);
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
    console.error('Error retrieving media:', error);
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
    
    console.log(`[MEDIA API] Saving media to year ${year}:`, {
      id: mediaData.id,
      filename: mediaData.originalFilename,
      takenAt: mediaData.takenAt,
      parsedDate: takenAtDate.toISOString(),
      hash: mediaData.metadata?.hash?.substring(0, 16) + '...'
    })

    // Add to media database for the year
    const mediaDb = getMediaDb(year);
    const updatedData = await withRetry(() =>
      mediaDb.update((current) => {
        console.log(`[MEDIA API] Current ${year} database has ${current.media.length} files before adding`)
        
        // Check for duplicates
        const existingIndex = current.media.findIndex(m => m.id === mediaData.id);
        
        if (existingIndex >= 0) {
          console.log(`[MEDIA API] Updating existing file at index ${existingIndex}`)
          // Update existing
          current.media[existingIndex] = mediaData;
        } else {
          console.log(`[MEDIA API] Adding new file to ${year} database`)
          // Add new
          current.media.push(mediaData);
        }

        // Sort by takenAt date (newest first)
        current.media.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());

        console.log(`[MEDIA API] ${year} database now has ${current.media.length} files after adding`)
        return current;
      })
    );
    
    console.log(`[MEDIA API] Successfully saved to ${year} database. Total files: ${updatedData.media.length}`)

    return NextResponse.json({
      success: true,
      message: 'Media metadata saved successfully',
      year,
      totalMedia: updatedData.media.length,
    });

  } catch (error) {
    console.error('Error saving media metadata:', error);
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

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
      totalMedia: updatedData.media.length,
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
} 