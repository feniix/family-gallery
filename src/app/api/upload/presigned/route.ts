import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generatePresignedUploadUrl, isValidFileType, generateFilePath } from '@/lib/r2';
import { uploadConfig, isFileSizeValid, getFileSizeLimitDisplay } from '@/lib/config';


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
    const body = await request.json();
    const { filename, contentType, fileSize, takenAt } = body;

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

    // Generate file path using EXIF date if available, otherwise current date
    const uploadDate = takenAt ? new Date(takenAt) : new Date();
    console.log(`Generating presigned URL for ${filename} with date: ${uploadDate.toISOString()} (${uploadDate.getFullYear()}/${String(uploadDate.getMonth() + 1).padStart(2, '0')})`);
    const filePath = generateFilePath.original(uploadDate, filename);

    // Generate presigned URL using configurable timeout
    const presignedUrl = await generatePresignedUploadUrl(
      filePath,
      contentType,
      uploadConfig.uploadTimeoutSeconds
    );

    // Create upload job ID for tracking
    const jobId = require('crypto').randomBytes(16).toString('hex');

    return NextResponse.json({
      success: true,
      presignedUrl,
      filePath,
      jobId,
      expiresIn: uploadConfig.uploadTimeoutSeconds,
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
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