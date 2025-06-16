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
  publicUrl: typeof window === 'undefined' ? process.env.R2_PUBLIC_URL : '',
  useSignedUrls: true, // Always use signed URLs
  endpoint: typeof window === 'undefined' ? process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '',
  region: 'auto',
  // Add forcePathStyle for custom domains
  forcePathStyle: true,
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
              forcePathStyle: r2Config.forcePathStyle,
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
  r2Logger.debug('Generating presigned download URL', { 
    key, 
    expiresIn,
    useSignedUrls: r2Config.useSignedUrls,
    publicUrl: r2Config.publicUrl ? 'configured' : 'not configured'
  });
  
  ensureServerSide();
  
  // Always use signed URLs

  try {
    const command = new GetObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
    });

    r2Logger.debug('Creating presigned download command', { 
      bucket: r2Config.bucketName, 
      key,
      endpoint: r2Config.endpoint,
      region: r2Config.region,
      forcePathStyle: r2Config.forcePathStyle
    });
    
    // Generate the signed URL with the correct options
    const presignedUrl = await getSignedUrl(r2Client!, command, { 
      expiresIn,
      // Signing options for AWS SDK v3
      signableHeaders: new Set(['host']),
      // Use the region from config
      signingRegion: r2Config.region,
      signingService: 's3',
    });
    
    // Replace default R2 endpoint with custom domain if configured
    let finalUrl = presignedUrl;
    
    if (r2Config.publicUrl) {
      try {
        // Parse the signed URL to extract the path and query parameters
        const url = new URL(presignedUrl);
        let path = url.pathname + url.search;
        
        // Remove bucket name from path if it's present (due to forcePathStyle)
        // The path will be like: /bucket-name/actual/file/path
        if (path.startsWith(`/${r2Config.bucketName}/`)) {
          path = path.substring(`/${r2Config.bucketName}`.length);
        }
        
        // Remove any trailing slashes from the public URL
        const cleanPublicUrl = r2Config.publicUrl.replace(/\/+$/, '');
        
        // Construct the new URL with the custom domain
        finalUrl = `${cleanPublicUrl}${path}`;
        
        r2Logger.debug('Generated custom domain URL', { 
          originalUrl: presignedUrl,
          customDomain: cleanPublicUrl,
          finalUrl,
          key,
          path,
          bucketName: r2Config.bucketName
        });
      } catch (error) {
        r2Logger.error('Error generating custom domain URL', {
          error: error instanceof Error ? error.message : String(error),
          presignedUrl,
          publicUrl: r2Config.publicUrl,
          key
        });
        // Fall back to the original signed URL if there was an error
        finalUrl = presignedUrl;
      }
    } else {
      r2Logger.warn('No custom domain configured, using default R2 endpoint', {
        presignedUrl,
        key
      });
    }
    
    r2Logger.debug('Presigned download URL generated successfully', { 
      key, 
      urlLength: finalUrl.length,
      expiresIn,
      finalUrl: finalUrl.substring(0, 100) + (finalUrl.length > 100 ? '...' : '')
    });
    
    return finalUrl;
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
 * Generate file paths for different types of content
 */
export const generateFilePath = {
  /**
   * Generate path for original uploaded files
   */
  original: (date: Date, filename: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Math.floor(date.getTime() / 1000); // Use provided date in seconds, not current time
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