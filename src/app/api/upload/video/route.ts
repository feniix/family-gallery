import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { uploadLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  let formData: FormData | null = null;
  try {
    uploadLogger.info('Video upload request started');
    
    const { userId } = await auth();
    
    if (!userId) {
      uploadLogger.warn('Video upload unauthorized - no userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    uploadLogger.info('Video upload authorized', { userId });
    formData = await request.formData();
    uploadLogger.info('FormData parsed successfully');
    const file = formData.get('file') as File;
    const userIdFromForm = formData.get('userId') as string;
    const tagsJson = formData.get('tags') as string;
    const videoMetadataJson = formData.get('videoMetadata') as string;
    const thumbnailFile = formData.get('thumbnail') as File;
    const visibility = formData.get('visibility') as string;
    
    uploadLogger.info('FormData contents extracted', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userIdFromForm,
      hasTags: !!tagsJson,
      hasVideoMetadata: !!videoMetadataJson,
      hasThumbnail: !!thumbnailFile,
      thumbnailSize: thumbnailFile?.size
    });
    
    if (!file) {
      uploadLogger.error('No file provided in upload request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      uploadLogger.error('Invalid file type', { fileType: file.type, fileName: file.name });
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
    
    // Process video metadata to extract creation date if available
    let takenAtDate: Date;
    let dateSource: 'exif' | 'filename' | 'file-creation' | 'upload-time' = 'upload-time';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    try {
      // Use the enhanced metadata processing for videos
      const { processMediaMetadata } = await import('@/lib/metadata');
      const { metadata: processedMetadata } = await processMediaMetadata(file, userIdFromForm || userId, 'web');
      
      takenAtDate = new Date(processedMetadata.takenAt);
      dateSource = processedMetadata.dateInfo.source;
      confidence = processedMetadata.dateInfo.confidence;
      
      uploadLogger.info('Extracted video date metadata', {
        filename: file.name,
        takenAt: takenAtDate.toISOString(),
        source: dateSource,
        confidence
      });
    } catch (error) {
      uploadLogger.warn('Failed to process video metadata, using upload time', { 
        filename: file.name, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Fallback to upload time
      takenAtDate = new Date();
      dateSource = 'upload-time';
      confidence = 'low';
    }
    
    const takenAt = takenAtDate.toISOString();
    const year = takenAtDate.getFullYear();
    const month = String(takenAtDate.getMonth() + 1).padStart(2, '0');
    const timestamp = Math.floor(takenAtDate.getTime() / 1000); // Use seconds like photos
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `originals/${year}/${month}/${timestamp}_${filename}`;
    
    // Get presigned URL for video upload
    uploadLogger.info('Generating presigned URL', { filePath, fileType: file.type });
    const { generatePresignedUploadUrl } = await import('@/lib/r2');
    const presignedUrl = await generatePresignedUploadUrl(filePath, file.type);
    uploadLogger.info('Presigned URL generated successfully');
    
    // Upload to R2
    uploadLogger.info('Starting R2 upload', { fileSize: file.size });
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });
    
    if (!uploadResponse.ok) {
      uploadLogger.error('R2 upload failed', { 
        status: uploadResponse.status, 
        statusText: uploadResponse.statusText 
      });
      throw new Error(`R2 upload failed: ${uploadResponse.status}`);
    }
    uploadLogger.info('R2 upload completed successfully');
    
    // Upload thumbnail if provided
    let thumbnailPath = '';
    if (thumbnailFile && thumbnailFile.size > 0) {
      thumbnailPath = `thumbnails/${year}/${month}/${timestamp}_thumbnail.jpg`;
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
        source: dateSource,
        confidence,
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
      visibility: (visibility as 'public' | 'family' | 'extended-family' | 'private') || 'family',
      hasValidExif: false,
    };
    
    // Save to database
    uploadLogger.info('Saving to database', { mediaId: result.id, year });
    const { getMediaDb, addYearToIndex } = await import('@/lib/json-db');
    const mediaDb = getMediaDb(year);
    await mediaDb.update((current) => {
      current.media.push(result);
      // Sort by takenAt date (newest first)
      current.media.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
      return current;
    });
    uploadLogger.info('Media saved to database successfully');

    // Update the media index to include this year
    uploadLogger.info('Updating media index');
    await addYearToIndex(year);
    uploadLogger.info('Media index updated successfully');

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

    uploadLogger.info('Video upload completed successfully', { 
      mediaId: result.id, 
      filename: result.originalFilename,
      hasThumbnail: !!result.thumbnailPath 
    });
    return NextResponse.json(result);

  } catch (error) {
    uploadLogger.error('Video upload failed', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      filename: formData?.get('file') ? (formData.get('file') as File).name : 'unknown'
    });
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 