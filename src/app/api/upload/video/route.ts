import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { uploadLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userIdFromForm = formData.get('userId') as string;
    const tagsJson = formData.get('tags') as string;
    const videoMetadataJson = formData.get('videoMetadata') as string;
    const thumbnailFile = formData.get('thumbnail') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Parse tags
    let tags: string[] = [];
    try {
      if (tagsJson) {
        tags = JSON.parse(tagsJson);
      }
    } catch (error) {
      uploadLogger.warn('Failed to parse tags, proceeding without tags', { error });
    }
    
    // Parse video metadata
    let videoMetadata: { width?: number; height?: number; duration?: number } | null = null;
    try {
      if (videoMetadataJson) {
        videoMetadata = JSON.parse(videoMetadataJson);
      }
    } catch (error) {
      uploadLogger.warn('Failed to parse video metadata, proceeding without metadata', { error });
    }

    // For now, handle video uploads without transaction system to avoid browser API issues
    // TODO: Implement proper server-side video processing or client-side thumbnail generation
    
    // Generate basic metadata
    const takenAt = new Date().toISOString();
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `originals/${year}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${timestamp}_${filename}`;
    
    // Get presigned URL for video upload
    const { generatePresignedUploadUrl } = await import('@/lib/r2');
    const presignedUrl = await generatePresignedUploadUrl(filePath, file.type);
    
    // Upload to R2
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`R2 upload failed: ${uploadResponse.status}`);
    }
    
    // Upload thumbnail if provided
    let thumbnailPath = '';
    if (thumbnailFile && thumbnailFile.size > 0) {
      thumbnailPath = `thumbnails/${year}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${timestamp}_thumbnail.jpg`;
      const thumbnailPresignedUrl = await generatePresignedUploadUrl(thumbnailPath, 'image/jpeg');
      
      const thumbnailUploadResponse = await fetch(thumbnailPresignedUrl, {
        method: 'PUT',
        body: thumbnailFile,
        headers: { 'Content-Type': 'image/jpeg' }
      });
      
      if (!thumbnailUploadResponse.ok) {
        uploadLogger.warn('Thumbnail upload failed, proceeding without thumbnail', {
          status: thumbnailUploadResponse.status
        });
        thumbnailPath = ''; // Clear on failure
      }
    }
    
    // Create media metadata
    const mediaId = `video_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
    const result = {
      id: mediaId,
      filename,
      originalFilename: file.name,
      path: filePath,
      type: 'video' as const,
      uploadedBy: userIdFromForm || userId,
      uploadedAt: new Date().toISOString(),
      uploadSource: 'web' as const,
      takenAt,
      dateInfo: {
        source: 'upload-time' as const,
        confidence: 'low' as const,
      },
      metadata: {
        size: file.size,
        hash: 'pending', // TODO: Generate hash
        width: videoMetadata?.width || 0,
        height: videoMetadata?.height || 0,
        duration: videoMetadata?.duration || 0,
      },
      ...(thumbnailPath && { thumbnailPath }),
      tags: tags,
      hasValidExif: false,
    };
    
    // Save to database
    const { getMediaDb, addYearToIndex } = await import('@/lib/json-db');
    const mediaDb = getMediaDb(year);
    await mediaDb.update((current) => {
      current.media.push(result);
      // Sort by takenAt date (newest first)
      current.media.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
      return current;
    });

    // Update the media index to include this year
    await addYearToIndex(year);

    // Add tags if provided
    if (tags.length > 0 && result.id) {
      try {
        const uniqueTags = [...new Set([...result.tags, ...tags])];
        if (uniqueTags.length !== result.tags.length) {
          // Update tags directly in the database instead of making HTTP request
          try {
            const { getMediaDb } = await import('@/lib/json-db');
            const mediaDb = getMediaDb(year);
            await mediaDb.update((current) => {
              const mediaIndex = current.media.findIndex(m => m.id === result.id);
              if (mediaIndex !== -1) {
                current.media[mediaIndex].tags = uniqueTags;
              }
              return current;
            });
            result.tags = uniqueTags;
            uploadLogger.info('Tags updated for uploaded video', { mediaId: result.id, tags: uniqueTags });
          } catch (tagError) {
            uploadLogger.warn('Failed to update tags for uploaded video', { error: tagError });
            // Continue without tags rather than failing the upload
            result.tags = uniqueTags; // Set in memory even if DB update failed
          }
        }
      } catch (tagError) {
        uploadLogger.warn('Failed to add tags to uploaded video', { error: tagError });
        // Continue without tags rather than failing the upload
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    uploadLogger.error('Video upload failed', { error });
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 