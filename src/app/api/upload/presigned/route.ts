import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generatePresignedUploadUrl, isValidFileType, generateFilePath } from '@/lib/r2';


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
    const { filename, contentType, fileSize } = body;

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

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Generate file path
    const uploadDate = new Date();
    const filePath = generateFilePath.original(uploadDate, filename);

    // Generate presigned URL (15 minute expiration)
    const presignedUrl = await generatePresignedUploadUrl(
      filePath,
      contentType,
      900 // 15 minutes
    );

    // Create upload job ID for tracking
    const jobId = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      presignedUrl,
      filePath,
      jobId,
      expiresIn: 900, // seconds
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