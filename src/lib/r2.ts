import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration
export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl: process.env.R2_PUBLIC_URL!,
};

// Validate R2 configuration
if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey || !r2Config.bucketName) {
  throw new Error('Missing required R2 environment variables');
}

// Create R2 client (S3-compatible)
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
});

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
  const command = new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
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
  const command = new GetObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Delete an object from R2
 * @param key - The object key (file path) to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Generate a public URL for an object in R2
 * @param key - The object key (file path) in R2
 * @returns Public URL (if bucket is public) or custom domain URL
 */
export function getPublicUrl(key: string): string {
  return `${r2Config.publicUrl}/${key}`;
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

/**
 * Utility to validate file types
 */
export const isValidFileType = (filename: string, type: 'image' | 'video' | 'any' = 'any'): boolean => {
  const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
  const videoTypes = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  switch (type) {
    case 'image':
      return imageTypes.includes(extension);
    case 'video':
      return videoTypes.includes(extension);
    case 'any':
      return [...imageTypes, ...videoTypes].includes(extension);
    default:
      return false;
  }
}; 