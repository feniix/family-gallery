import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, withRetry } from '@/lib/json-db';
import { apiLogger } from '@/lib/logger';
import { getIsAdmin } from '@/lib/server-auth';

/**
 * PUT /api/media/visibility
 * Update media visibility/privacy settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { mediaId, visibility } = body;

    // Validate required fields
    if (!mediaId || !visibility) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaId, visibility' },
        { status: 400 }
      );
    }

    // Validate visibility value
    const validVisibilities = ['public', 'family', 'extended-family', 'private'];
    if (!validVisibilities.includes(visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility value. Must be one of: ' + validVisibilities.join(', ') },
        { status: 400 }
      );
    }

    apiLogger.debug('Updating media visibility', { 
      mediaId, 
      visibility, 
      userId 
    });

    // Find the media across all years
    let mediaFound = false;
    let updatedMedia = null;
    const currentYear = new Date().getFullYear();
    const yearsToCheck = [];
    
    // Check current year and a few years back/forward
    for (let i = -5; i <= 2; i++) {
      yearsToCheck.push(currentYear + i);
    }

    for (const year of yearsToCheck) {
      try {
        const mediaDb = getMediaDb(year);
        const mediaData = await withRetry(() => mediaDb.read());
        
        const mediaIndex = mediaData.media.findIndex(media => media.id === mediaId);
        if (mediaIndex !== -1) {
          const media = mediaData.media[mediaIndex];
          
          // Check if user has permission to modify this media
          const isAdmin = await getIsAdmin();
          const isOwner = media.uploadedBy === userId;
          
          if (!isAdmin && !isOwner) {
            return NextResponse.json(
              { error: 'You can only modify your own media' },
              { status: 403 }
            );
          }

          // Update the visibility
          mediaData.media[mediaIndex] = {
            ...media,
            visibility: visibility as 'public' | 'family' | 'extended-family' | 'private'
          };

          // Save back to database
          await withRetry(() => mediaDb.write(mediaData));
          
          updatedMedia = mediaData.media[mediaIndex];
          mediaFound = true;
          
          apiLogger.info('Media visibility updated successfully', {
            mediaId,
            visibility,
            year,
            userId,
            isAdmin,
            isOwner
          });
          
          break;
        }
      } catch (error) {
        apiLogger.debug(`Error checking year ${year}`, { 
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue to next year
      }
    }

    if (!mediaFound) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Media visibility updated successfully',
      media: updatedMedia
    });

  } catch (error) {
    apiLogger.error('Error updating media visibility', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Failed to update media visibility' },
      { status: 500 }
    );
  }
} 