import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration - only available on server-side
export const r2Config = {
  accountId: typeof window === 'undefined' ? process.env.R2_ACCOUNT_ID! : '',
  accessKeyId: typeof window === 'undefined' ? process.env.R2_ACCESS_KEY_ID! : '',
  secretAccessKey: typeof window === 'undefined' ? process.env.R2_SECRET_ACCESS_KEY! : '',
  bucketName: typeof window === 'undefined' ? process.env.R2_BUCKET_NAME! : '',
  publicUrl: typeof window === 'undefined' ? process.env.R2_PUBLIC_URL : '', // Optional
};

// Validate R2 configuration (only on server-side, skip in test environment)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey || !r2Config.bucketName) {
    throw new Error('Missing required R2 environment variables');
  }
}

// Create R2 client (S3-compatible) - only on server-side, mock in test environment
export const r2Client = typeof window === 'undefined' 
  ? (process.env.NODE_ENV === 'test' 
      ? null  // Skip S3Client creation in test environment
      : new S3Client({
          region: 'auto',
          endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: r2Config.accessKeyId,
            secretAccessKey: r2Config.secretAccessKey,
          },
        })
    )
  : null;

/**
 * Ensure we're on server-side before making R2 calls
 */
function ensureServerSide(): void {
  if (typeof window !== 'undefined') {
    throw new Error('R2 operations can only be performed on the server-side');
  }
  if (process.env.NODE_ENV === 'test') {
    return; // Skip R2 client checks in test environment
  }
  if (!r2Client) {
    throw new Error('R2 client not initialized');
  }
}

/**
 * Generate a presigned URL for uploading files to R2
 * @param key - The object key (file path) in R2
 * @param expiresIn - Expiration time in seconds (default: 15 minutes)
 * @returns Presigned URL for upload
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType?: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> {
  ensureServerSide();
  
  // Return mock URL in test environment
  if (process.env.NODE_ENV === 'test') {
    return `https://test.r2.dev/upload/${key}?expires=${Date.now() + expiresIn * 1000}`;
  }
  
  const command = new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client!, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading files from R2
 * @param key - The object key (file path) in R2
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Presigned URL for download
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  ensureServerSide();
  
  const command = new GetObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
  });

  return await getSignedUrl(r2Client!, command, { expiresIn });
}

/**
 * Delete an object from R2
 * @param key - The object key (file path) to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  ensureServerSide();
  
  const command = new DeleteObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
  });

  await r2Client!.send(command);
}

/**
 * Generate a public URL for an object in R2
 * @deprecated This function is not used since the app uses authenticated API routes
 * @param key - The object key (file path) in R2
 * @returns Public URL (if bucket is public) or custom domain URL
 */
export function getPublicUrl(key: string): string {
  const publicUrl = typeof window === 'undefined' ? r2Config.publicUrl : process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error('R2 public URL not configured - but this function should not be used anyway');
  }
  return `${publicUrl}/${key}`;
}

/**
 * Generate file paths for different types of content
 */
export const generateFilePath = {
  /**
   * Generate path for original uploaded files
   */
  original: (date: Date, filename: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    return `originals/${year}/${month}/${timestamp}_${filename}`;
  },

  /**
   * Generate path for thumbnail images
   */
  thumbnail: (originalPath: string): string => {
    const pathParts = originalPath.split('/');
    const filename = pathParts.pop()!;
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    return `thumbnails/${pathParts.slice(1).join('/')}/${nameWithoutExt}_thumb.jpg`;
  },

  /**
   * Generate path for JSON data files
   */
  jsonData: (filename: string): string => {
    return `data/${filename}`;
  },
};

// Re-export from consolidated location
export { isValidFileType } from '@/lib/utils'; 