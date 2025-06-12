import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { generatePresignedUploadUrl, isValidFileType, generateFilePath } from '@/lib/r2';
import { uploadConfig, isFileSizeValid, getFileSizeLimitDisplay } from '@/lib/config';
import { r2Logger } from '@/lib/logger';


/**
 * POST /api/upload/presigned
 * Generate presigned URLs for file uploads
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { filename, contentType, fileSize, takenAt, customPath } = body;

    // Validate required fields
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, contentType' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidFileType(filename)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and videos are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size using type-specific limits
    if (fileSize && !isFileSizeValid(fileSize, contentType)) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${getFileSizeLimitDisplay(contentType)}.` },
        { status: 400 }
      );
    }

    // Generate file path
    let filePath: string;
    if (customPath) {
      // Use the provided custom path (for thumbnails)
      filePath = customPath;
      r2Logger.debug(`Using custom path for presigned URL`, { 
        filename, 
        customPath 
      });
    } else {
      // Generate path using EXIF date if available, otherwise current date
      const uploadDate = takenAt ? new Date(takenAt) : new Date();
      r2Logger.debug(`Generating presigned URL`, { 
        filename, 
        uploadDate: uploadDate.toISOString(), 
        year: uploadDate.getFullYear(),
        month: String(uploadDate.getMonth() + 1).padStart(2, '0')
      });
      filePath = generateFilePath.original(uploadDate, filename);
    }

    // Generate presigned URL using configurable timeout
    const presignedUrl = await generatePresignedUploadUrl(
      filePath,
      contentType,
      uploadConfig.uploadTimeoutSeconds
    );

    // Create upload job ID for tracking
    const jobId = randomUUID();

    return NextResponse.json({
      success: true,
      presignedUrl,
      filePath,
      jobId,
      expiresIn: uploadConfig.uploadTimeoutSeconds,
    });

  } catch (error) {
    r2Logger.error('Error generating presigned URL', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/upload/presigned
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