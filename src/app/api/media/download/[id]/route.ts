import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMediaDb, withRetry } from '@/lib/json-db';
import { r2Client } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/media/download/[id]
 * Download media file from R2 storage
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

    // Check if this is a thumbnail request
    const url = new URL(request.url);
    const isThumbnail = url.pathname.endsWith('/thumbnail') || url.searchParams.has('thumbnail');

    // Find the media in our database
    let mediaItem = null;
    const currentYear = new Date().getFullYear();
    
    // Search through years to find the media item
    for (let year = currentYear + 1; year >= currentYear - 10; year--) {
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
      // Get file from R2
      if (!r2Client) {
        return NextResponse.json({ error: 'Storage not available' }, { status: 500 });
      }

      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: filePath,
      });

      const response = await r2Client.send(getObjectCommand);
      
      if (!response.Body) {
        return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
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

      // Determine content type
      const contentType = getContentType(mediaItem.type, mediaItem.originalFilename, isThumbnail);

      // Set appropriate headers
      const headers = new Headers({
        'Content-Type': contentType,
        'Content-Length': combined.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      });

      // Add download header if not a thumbnail
      if (!isThumbnail) {
        headers.set('Content-Disposition', `inline; filename="${mediaItem.originalFilename}"`);
      }

      apiLogger.info('Media file served', {
        mediaId: id,
        filename: mediaItem.originalFilename,
        fileSize: combined.length,
        isThumbnail,
        userId
      });

      return new NextResponse(combined, { headers });

    } catch (storageError) {
      apiLogger.error('Error retrieving file from storage', {
        mediaId: id,
        filePath,
        error: storageError instanceof Error ? storageError.message : storageError
      });
      return NextResponse.json({ error: 'File not accessible' }, { status: 500 });
    }

  } catch (error) {
    apiLogger.error('Error in media download endpoint', {
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

function getContentType(mediaType: string, filename: string, isThumbnail: boolean): string {
  if (isThumbnail) {
    return 'image/jpeg'; // Thumbnails are always JPEG
  }

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