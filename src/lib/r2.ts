import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Logger } from './logger';

// R2 Configuration - only available on server-side
export const r2Config = {
  accountId: typeof window === 'undefined' ? process.env.R2_ACCOUNT_ID! : '',
  accessKeyId: typeof window === 'undefined' ? process.env.R2_ACCESS_KEY_ID! : '',
  secretAccessKey: typeof window === 'undefined' ? process.env.R2_SECRET_ACCESS_KEY! : '',
  bucketName: typeof window === 'undefined' ? process.env.R2_BUCKET_NAME! : '',
  publicUrl: typeof window === 'undefined' ? process.env.R2_PUBLIC_URL : '', // Optional
};

// Validate R2 configuration function - called when actually needed
function validateR2Config(): void {
  r2Logger.debug('Validating R2 configuration', {
    hasAccountId: !!r2Config.accountId,
    hasAccessKeyId: !!r2Config.accessKeyId,
    hasSecretAccessKey: !!r2Config.secretAccessKey,
    hasBucketName: !!r2Config.bucketName,
    hasPublicUrl: !!r2Config.publicUrl
  });
  
  if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey || !r2Config.bucketName) {
    r2Logger.error('Missing required R2 environment variables', {
      accountId: !!r2Config.accountId,
      accessKeyId: !!r2Config.accessKeyId,
      secretAccessKey: !!r2Config.secretAccessKey,
      bucketName: !!r2Config.bucketName
    });
    throw new Error('Missing required R2 environment variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
  }
  
  r2Logger.debug('R2 configuration validated successfully');
}

// Create R2 client (S3-compatible) - only on server-side, mock in test environment
export const r2Client = typeof window === 'undefined' 
  ? (process.env.NODE_ENV === 'test' 
      ? null  // Skip S3Client creation in test environment
      : (() => {
          // Validate configuration before creating client
          try {
            validateR2Config();
            const endpoint = `https://${r2Config.accountId}.r2.cloudflarestorage.com`;
            r2Logger.debug('Creating R2 client', { endpoint, bucketName: r2Config.bucketName });
            
            const client = new S3Client({
              region: 'auto',
              endpoint,
              credentials: {
                accessKeyId: r2Config.accessKeyId,
                secretAccessKey: r2Config.secretAccessKey,
              },
            });
            
            r2Logger.info('R2 client initialized successfully');
            return client;
          } catch (error) {
            // During build time or when R2 is not configured, return null
            // The actual validation will happen when R2 functions are called
            r2Logger.warn('R2 client not initialized', { error: error instanceof Error ? error.message : 'Unknown error' });
            return null;
          }
        })()
    )
  : null;

/**
 * Ensure we're on server-side before making R2 calls
 */
function ensureServerSide(): void {
  r2Logger.debug('Ensuring server-side execution for R2 operations');
  
  if (typeof window !== 'undefined') {
    r2Logger.error('Attempted R2 operation from client-side');
    throw new Error('R2 operations can only be performed on the server-side');
  }
  
  if (process.env.NODE_ENV === 'test') {
    r2Logger.debug('Skipping R2 client checks in test environment');
    return; // Skip R2 client checks in test environment
  }
  
  if (!r2Client) {
    r2Logger.error('R2 client not available');
    // Try to validate configuration to give a better error message
    try {
      validateR2Config();
      throw new Error('R2 client not initialized despite valid configuration');
    } catch (configError) {
      throw new Error(`R2 client not available: ${configError instanceof Error ? configError.message : 'Unknown error'}`);
    }
  }
  
  r2Logger.debug('R2 server-side validation passed');
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
  r2Logger.debug('Generating presigned upload URL', { key, contentType, expiresIn });
  ensureServerSide();
  
  // Return mock URL in test environment
  if (process.env.NODE_ENV === 'test') {
    const mockUrl = `https://test.r2.dev/upload/${key}?expires=${Date.now() + expiresIn * 1000}`;
    r2Logger.debug('Returning mock URL for test environment', { mockUrl });
    return mockUrl;
  }
  
  try {
    const command = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
      ContentType: contentType,
    });

    r2Logger.debug('Creating presigned URL command', { bucket: r2Config.bucketName, key, contentType });
    const presignedUrl = await getSignedUrl(r2Client!, command, { expiresIn });
    r2Logger.debug('Presigned upload URL generated successfully', { key, urlLength: presignedUrl.length });
    
    return presignedUrl;
  } catch (error) {
    r2Logger.error('Failed to generate presigned upload URL', { 
      key, 
      contentType, 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
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
  r2Logger.debug('Generating presigned download URL', { key, expiresIn });
  ensureServerSide();
  
  try {
    const command = new GetObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
    });

    r2Logger.debug('Creating presigned download command', { bucket: r2Config.bucketName, key });
    const presignedUrl = await getSignedUrl(r2Client!, command, { expiresIn });
    r2Logger.debug('Presigned download URL generated successfully', { key, urlLength: presignedUrl.length });
    
    return presignedUrl;
  } catch (error) {
    r2Logger.error('Failed to generate presigned download URL', { 
      key, 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Delete an object from R2
 * @param key - The object key (file path) to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  r2Logger.debug('Deleting object from R2', { key });
  ensureServerSide();
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
    });

    r2Logger.debug('Sending delete command to R2', { bucket: r2Config.bucketName, key });
    await r2Client!.send(command);
    r2Logger.debug('Object deleted successfully from R2', { key });
  } catch (error) {
    r2Logger.error('Failed to delete object from R2', { 
      key, 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
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