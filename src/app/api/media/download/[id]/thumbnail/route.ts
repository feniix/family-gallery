import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, withRetry } from '@/lib/json-db';
import { r2Client } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/media/download/[id]/thumbnail
 * Download thumbnail with fallback to original image
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

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

    // Function to get file from R2 with error handling
    const getFileFromStorage = async (path: string) => {
      if (!r2Client) {
        throw new Error('Storage not available');
      }

      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: path,
      });

      const response = await r2Client.send(getObjectCommand);
      
      if (!response.Body) {
        throw new Error('File not found in storage');
      }

      // Convert the readable stream to array buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Combine chunks into a single array buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      return combined;
    };

    // Try to get thumbnail first, fall back to original if thumbnail doesn't exist
    try {
      let fileData: Uint8Array;
      let actualPath: string;
      let isFallback = false;

      if (mediaItem.thumbnailPath) {
        try {
          fileData = await getFileFromStorage(mediaItem.thumbnailPath);
          actualPath = mediaItem.thumbnailPath;
        } catch (thumbnailError) {
          // Thumbnail not found, try original
          apiLogger.info('Thumbnail not found, attempting fallback to original image', {
            mediaId: id,
            thumbnailPath: mediaItem.thumbnailPath,
            originalPath: mediaItem.path,
            thumbnailError: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'
          });
          
          fileData = await getFileFromStorage(mediaItem.path);
          actualPath = mediaItem.path;
          isFallback = true;
        }
      } else {
        // No thumbnail path, use original
        fileData = await getFileFromStorage(mediaItem.path);
        actualPath = mediaItem.path;
        isFallback = true;
      }

      // Determine content type (always JPEG for thumbnails, original MIME type for fallback)
      const contentType = isFallback 
        ? getContentType(mediaItem.type, mediaItem.originalFilename)
        : 'image/jpeg';

      // Set appropriate headers
      const headers = new Headers({
        'Content-Type': contentType,
        'Content-Length': fileData.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      });

      apiLogger.info(isFallback ? 'Fallback to original image served' : 'Thumbnail served', {
        mediaId: id,
        filename: mediaItem.originalFilename,
        fileSize: fileData.length,
        originallyRequestedThumbnail: true,
        servedPath: actualPath,
        isFallback,
        userId
      });

      return new NextResponse(fileData, { headers });

    } catch (storageError) {
      apiLogger.error('Error retrieving file from storage', {
        mediaId: id,
        thumbnailPath: mediaItem.thumbnailPath,
        originalPath: mediaItem.path,
        error: storageError instanceof Error ? storageError.message : storageError
      });
      return NextResponse.json({ error: 'File not accessible' }, { status: 500 });
    }

  } catch (error) {
    apiLogger.error('Error in thumbnail download endpoint', {
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

function getContentType(mediaType: string, filename: string): string {
  if (mediaType === 'video') {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      case 'webm': return 'video/webm';
      default: return 'video/mp4';
    }
  }

  // Image files
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
} 