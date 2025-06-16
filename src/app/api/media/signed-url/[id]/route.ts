import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, withRetry } from '@/lib/json-db';
import { generatePresignedDownloadUrl } from '@/lib/r2';
import { apiLogger } from '@/lib/logger';
import { checkUserHasAccessSmart } from '@/lib/server-auth';

/**
 * GET /api/media/signed-url/[id]
 * Generate signed URLs for direct R2 access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user access permissions
    const hasAccess = await checkUserHasAccessSmart({ userId });
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    // Check if this is a thumbnail request
    const url = new URL(request.url);
    const isThumbnail = url.searchParams.has('thumbnail');
    const expiresIn = parseInt(url.searchParams.get('expires') || '3600'); // Default 1 hour

    // Validate expiration time (max 24 hours for security)
    const maxExpiration = 24 * 60 * 60; // 24 hours
    const actualExpiration = Math.min(expiresIn, maxExpiration);

    // Find the media in our database using the media index
    let mediaItem = null;
    
    try {
      // First, get the media index to know which years have data
      const { mediaIndexDb } = await import('@/lib/json-db');
      const index = await withRetry(() => mediaIndexDb.read());
      
      // Search only through years that actually have data
      for (const year of index.years) {
        try {
          const mediaDb = getMediaDb(year);
          const mediaData = await withRetry(() => mediaDb.read());
          
          const found = mediaData.media?.find(item => item.id === id);
          if (found) {
            mediaItem = found;
            break;
          }
        } catch {
          // Continue searching other years
          continue;
        }
      }
    } catch {
      // Fallback: search recent years if index is not available
      const currentYear = new Date().getFullYear();
      for (let year = currentYear; year >= currentYear - 5; year--) {
        try {
          const mediaDb = getMediaDb(year);
          const mediaData = await withRetry(() => mediaDb.read());
          
          const found = mediaData.media?.find(item => item.id === id);
          if (found) {
            mediaItem = found;
            break;
          }
        } catch {
          // Continue searching other years
          continue;
        }
      }
    }

    if (!mediaItem) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Determine the file path
    const filePath = isThumbnail 
      ? mediaItem.thumbnailPath || mediaItem.path 
      : mediaItem.path;

    if (!filePath) {
      return NextResponse.json({ error: 'File path not found' }, { status: 404 });
    }

    try {
      // Generate signed URL for direct R2 access
      const signedUrl = await generatePresignedDownloadUrl(filePath, actualExpiration);

      apiLogger.info('Signed URL generated', {
        mediaId: id,
        filename: mediaItem.originalFilename,
        isThumbnail,
        filePath,
        expiresIn: actualExpiration,
        userId
      });

      return NextResponse.json({
        signedUrl,
        expiresIn: actualExpiration,
        expiresAt: new Date(Date.now() + actualExpiration * 1000).toISOString(),
        mediaId: id,
        filename: mediaItem.originalFilename,
        isThumbnail
      });

    } catch (error) {
      apiLogger.error('Error generating signed URL', {
        mediaId: id,
        filePath,
        isThumbnail,
        error: error instanceof Error ? error.message : error
      });
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

  } catch (error) {
    apiLogger.error('Error in signed URL endpoint', {
      mediaId: 'unknown',
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/media/signed-url/[id]
 * Handle preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 