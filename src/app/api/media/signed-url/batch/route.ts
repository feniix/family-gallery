import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, withRetry } from '@/lib/json-db';
import { generatePresignedDownloadUrl } from '@/lib/r2';
import { apiLogger } from '@/lib/logger';
import { checkUserHasAccessSmart } from '@/lib/server-auth';

interface MediaItem {
  id: string;
  originalFilename: string;
  path: string;
  thumbnailPath?: string;
  type: string;
}

interface BatchSignedUrlRequest {
  requests: Array<{
    mediaId: string;
    isThumbnail?: boolean;
    expiresIn?: number;
  }>;
}

interface BatchSignedUrlResponse {
  results: Array<{
    mediaId: string;
    signedUrl?: string;
    expiresIn?: number;
    expiresAt?: string;
    isThumbnail: boolean;
    error?: string;
  }>;
  success: boolean;
  processed: number;
  errors: number;
}

/**
 * POST /api/media/signed-url/batch
 * Generate multiple signed URLs in a single request
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    let body: BatchSignedUrlRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { requests } = body;

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid requests array' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (requests.length > 50) {
      return NextResponse.json(
        { error: 'Batch size limited to 50 requests' },
        { status: 400 }
      );
    }

    // Build media lookup map for efficient searching
    const mediaMap = new Map<string, MediaItem>();
    
    try {
      // Get the media index to know which years have data
      const { mediaIndexDb } = await import('@/lib/json-db');
      const index = await withRetry(() => mediaIndexDb.read());
      
      // Load all media from relevant years
      for (const year of index.years) {
        try {
          const mediaDb = getMediaDb(year);
          const mediaData = await withRetry(() => mediaDb.read());
          
          if (mediaData.media) {
            for (const media of mediaData.media) {
              mediaMap.set(media.id, media);
            }
          }
        } catch {
          // Continue with other years if one fails
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
          
          if (mediaData.media) {
            for (const media of mediaData.media) {
              mediaMap.set(media.id, media);
            }
          }
        } catch {
          // Continue with other years
          continue;
        }
      }
    }

    // Process each request
    const results: BatchSignedUrlResponse['results'] = [];
    let processed = 0;
    let errors = 0;

    for (const req of requests) {
      const { mediaId, isThumbnail = false, expiresIn = 3600 } = req;
      
      try {
        // Validate expiration time (max 24 hours for security)
        const maxExpiration = 24 * 60 * 60; // 24 hours
        const actualExpiration = Math.min(expiresIn, maxExpiration);

        // Find media item
        const mediaItem = mediaMap.get(mediaId);
        if (!mediaItem) {
          results.push({
            mediaId,
            isThumbnail,
            error: 'Media not found'
          });
          errors++;
          continue;
        }

        // Determine the file path
        const filePath = isThumbnail 
          ? mediaItem.thumbnailPath || mediaItem.path 
          : mediaItem.path;

        if (!filePath) {
          results.push({
            mediaId,
            isThumbnail,
            error: 'File path not found'
          });
          errors++;
          continue;
        }

        // Generate signed URL
        const signedUrl = await generatePresignedDownloadUrl(filePath, actualExpiration);

        results.push({
          mediaId,
          signedUrl,
          expiresIn: actualExpiration,
          expiresAt: new Date(Date.now() + actualExpiration * 1000).toISOString(),
          isThumbnail
        });
        processed++;

      } catch (error) {
        apiLogger.error('Error generating signed URL in batch', {
          mediaId,
          error: error instanceof Error ? error.message : error
        });
        
        results.push({
          mediaId,
          isThumbnail,
          error: 'Failed to generate signed URL'
        });
        errors++;
      }
    }

    apiLogger.info('Batch signed URLs generated', {
      userId,
      totalRequests: requests.length,
      processed,
      errors
    });

    const response: BatchSignedUrlResponse = {
      results,
      success: errors === 0,
      processed,
      errors
    };

    return NextResponse.json(response);

  } catch (error) {
    apiLogger.error('Error in batch signed URL endpoint', {
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
 * OPTIONS /api/media/signed-url/batch
 * Handle preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 