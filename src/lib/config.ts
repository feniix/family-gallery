/// <reference types="node" />

/**
 * Application configuration
 * 
 * This file contains configurable settings that can be adjusted
 * via environment variables or direct modification.
 */

/**
 * Upload configuration
 */
export const uploadConfig = {
  // Maximum file sizes in MB (converted to bytes internally)
  maxPhotoSizeMB: parseInt(process.env.UPLOAD_MAX_PHOTO_SIZE_MB || '50'), // Default: 50MB for photos
  maxVideoSizeMB: parseInt(process.env.UPLOAD_MAX_VIDEO_SIZE_MB || '200'), // Default: 200MB for videos
  
  // Getters for backward compatibility and internal use
  get maxFileSize() {
    // Return the larger of the two for general use
    return Math.max(this.maxPhotoSizeMB, this.maxVideoSizeMB) * 1024 * 1024;
  },
  get maxPhotoSize() {
    return this.maxPhotoSizeMB * 1024 * 1024;
  },
  get maxVideoSize() {
    return this.maxVideoSizeMB * 1024 * 1024;
  },
  
  // Supported file types
  supportedImageTypes: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'],
  supportedVideoTypes: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'],
  
  // Upload timeout in seconds
  uploadTimeoutSeconds: parseInt(process.env.UPLOAD_TIMEOUT_SECONDS || '900'), // Default: 15 minutes
} as const;

/**
 * Gallery configuration
 */
export const galleryConfig = {
  // Number of items to load per page
  itemsPerPage: parseInt(process.env.GALLERY_ITEMS_PER_PAGE || '20'),
  
  // Year range for media scanning
  minYear: parseInt(process.env.GALLERY_MIN_YEAR || '1970'),
  maxYearOffset: parseInt(process.env.GALLERY_MAX_YEAR_OFFSET || '10'), // Current year + offset
} as const;

/**
 * R2 configuration
 */
export const r2Config = {
  // Presigned URL expiration in seconds
  presignedUrlExpiration: parseInt(process.env.R2_PRESIGNED_URL_EXPIRATION || '900'), // Default: 15 minutes
} as const;

/**
 * Helper functions
 */

/**
 * Get maximum file size display for photos
 */
export function getMaxPhotoSizeDisplay(): string {
  return `${uploadConfig.maxPhotoSizeMB}MB`;
}

/**
 * Get maximum file size display for videos
 */
export function getMaxVideoSizeDisplay(): string {
  return `${uploadConfig.maxVideoSizeMB}MB`;
}

/**
 * Get maximum file size in a human readable format (backward compatibility)
 */
export function getMaxFileSizeDisplay(): string {
  return `${getMaxPhotoSizeDisplay()} (photos), ${getMaxVideoSizeDisplay()} (videos)`;
}

/**
 * Check if a file size is within the allowed limit based on file type
 */
export function isFileSizeValid(fileSize: number, fileType?: string): boolean {
  if (!fileType) {
    // If no type specified, use the general limit (backward compatibility)
    return fileSize <= uploadConfig.maxFileSize;
  }
  
  if (fileType.startsWith('image/')) {
    return fileSize <= uploadConfig.maxPhotoSize;
  } else if (fileType.startsWith('video/')) {
    return fileSize <= uploadConfig.maxVideoSize;
  }
  
  // Default to photo size for unknown types
  return fileSize <= uploadConfig.maxPhotoSize;
}

/**
 * Get the appropriate file size limit for a given file type
 */
export function getFileSizeLimit(fileType: string): number {
  if (fileType.startsWith('image/')) {
    return uploadConfig.maxPhotoSize;
  } else if (fileType.startsWith('video/')) {
    return uploadConfig.maxVideoSize;
  }
  
  // Default to photo size for unknown types
  return uploadConfig.maxPhotoSize;
}

/**
 * Get the appropriate file size limit display for a given file type
 */
export function getFileSizeLimitDisplay(fileType: string): string {
  if (fileType.startsWith('image/')) {
    return getMaxPhotoSizeDisplay();
  } else if (fileType.startsWith('video/')) {
    return getMaxVideoSizeDisplay();
  }
  
  // Default to photo size for unknown types
  return getMaxPhotoSizeDisplay();
}

/**
 * Get all supported file extensions
 */
export function getSupportedFileExtensions(): string[] {
  return [...uploadConfig.supportedImageTypes, ...uploadConfig.supportedVideoTypes];
}

/**
 * Check if a file extension is supported
 */
export function isFileExtensionSupported(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return getSupportedFileExtensions().includes(extension);
}

// Server-side configuration
export const config = {
  r2: {
    bucketName: process.env.R2_BUCKET_NAME!,
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    publicUrl: process.env.R2_PUBLIC_URL!,
  },
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
  },
  env: {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },
  adminEmails: process.env.ADMIN_EMAILS?.split(',') || [],
}

// Client-safe configuration (only public env vars)
export const clientConfig = {
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
  },
  env: {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },
}

// Validate required environment variables (server-side only)
const requiredEnvVars = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
  'ADMIN_EMAILS',
]

if (typeof window === 'undefined' && config.env.isProduction) {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
} 