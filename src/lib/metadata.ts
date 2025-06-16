import { MediaMetadata, ExifMetadata, FileNamingResult } from '@/types/media';
import { extractExifMetadata, isScreenshot, isEditedPhoto } from './exif';
import { processDateWithFallbacks } from './date-handling';
import { generateUniqueFilename } from './file-naming';
import { isFileSizeValid, getFileSizeLimitDisplay } from '@/lib/config';
import { uploadLogger } from './logger';
import { generateFileHash } from './utils/hash-generation';

/**
 * Process metadata for an uploaded file
 */
export async function processMediaMetadata(
  file: File,
  uploadedBy: string,
  uploadSource: 'web' | 'whatsapp' | 'email' = 'web',
  preExtractedExifData?: ExifMetadata | null
): Promise<{
  metadata: Omit<MediaMetadata, 'id' | 'path' | 'thumbnailPath'>;
  fileNaming: FileNamingResult;
  hash: string;
}> {
  uploadLogger.debug(`Processing metadata for ${file.name}`);
  
  // Generate file hash for duplicate detection
  let hash: string;
  try {
    hash = await generateFileHash(file);
    uploadLogger.debug(`Generated file hash`, { filename: file.name, hashPrefix: hash.substring(0, 16) + '...' });
  } catch (error) {
    uploadLogger.error('Error generating file hash', { filename: file.name, error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
  
  // Use pre-extracted EXIF data if provided, otherwise extract it
  let exifData: ExifMetadata | null = null;
  let videoMetadata: { 
    creationDate?: Date; 
    width?: number; 
    height?: number; 
    duration?: number;
    codec?: string;
    bitrate?: number;
    framerate?: number;
    camera?: string;
    software?: string;
    location?: { lat: number; lng: number };
  } | null = null;
  
  if (preExtractedExifData !== undefined) {
    exifData = preExtractedExifData;
    uploadLogger.debug(`Using pre-extracted EXIF data`, { 
      filename: file.name,
      hasData: !!exifData,
      hasDate: !!exifData?.dateTimeOriginal,
      camera: exifData?.make && exifData?.model ? `${exifData.make} ${exifData.model}` : 'Unknown'
    });
  } else if (file.type.startsWith('image/')) {
    exifData = await extractExifMetadata(file);
  } else if (file.type.startsWith('video/')) {
    // Extract video metadata including creation date using MediaInfo.js
    try {
      const { extractVideoMetadataWithMediaInfo } = await import('@/lib/video-processing');
      videoMetadata = await extractVideoMetadataWithMediaInfo(file);
      uploadLogger.debug(`Extracted video metadata with MediaInfo`, { 
        filename: file.name,
        hasCreationDate: !!videoMetadata?.creationDate,
        duration: videoMetadata?.duration,
        dimensions: videoMetadata?.width && videoMetadata?.height ? `${videoMetadata.width}x${videoMetadata.height}` : 'unknown',
        codec: videoMetadata?.codec,
        camera: videoMetadata?.camera
      });
    } catch (error) {
      uploadLogger.warn('Failed to extract video metadata with MediaInfo, trying fallback', { 
        filename: file.name, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Fallback to basic HTML5 video element extraction
      try {
        videoMetadata = await extractVideoMetadataWithDate(file);
        uploadLogger.debug(`Extracted video metadata with HTML5 fallback`, { 
          filename: file.name,
          hasCreationDate: !!videoMetadata?.creationDate,
          duration: videoMetadata?.duration
        });
      } catch (fallbackError) {
        uploadLogger.error('All video metadata extraction methods failed', { 
          filename: file.name, 
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error' 
        });
        videoMetadata = null;
      }
    }
  }
  
  // Process date with fallback strategies
  const dateResult = await processDateWithFallbacks(file, exifData || undefined, videoMetadata);
  
  // Generate unique filename and path
  const fileNaming = generateUniqueFilename(file.name, dateResult.takenAt);
  
  // Detect file characteristics
  const isScreenshotFile = isScreenshot(file.name);
  const isEditedFile = isEditedPhoto(file.name, exifData || undefined);
  
  // Build basic metadata
  const metadata: Omit<MediaMetadata, 'id' | 'path' | 'thumbnailPath'> = {
    filename: fileNaming.filename,
    originalFilename: file.name,
    type: file.type.startsWith('video/') ? 'video' : 'photo',
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    uploadSource,
    takenAt: dateResult.takenAt.toISOString(),
    dateInfo: {
      source: dateResult.dateSource,
      timezone: dateResult.timezone,
      confidence: dateResult.confidence,
    },
    metadata: {
      size: file.size,
      hash,
      // Add EXIF data if available
      ...(exifData && { exif: exifData }),
      // Add video metadata if available
      ...(videoMetadata?.width && { width: videoMetadata.width }),
      ...(videoMetadata?.height && { height: videoMetadata.height }),
      ...(videoMetadata?.duration && { duration: videoMetadata.duration }),
      ...(videoMetadata?.codec && { videoCodec: videoMetadata.codec }),
      ...(videoMetadata?.bitrate && { bitrate: videoMetadata.bitrate }),
      ...(videoMetadata?.framerate && { framerate: videoMetadata.framerate }),
      // Add GPS location from video metadata if available
      ...(videoMetadata?.location && {
        location: {
          lat: videoMetadata.location.lat,
          lng: videoMetadata.location.lng,
        },
      }),
      // Add GPS location from EXIF if available (for images)
      ...(exifData?.gps && {
        location: {
          lat: exifData.gps.latitude,
          lng: exifData.gps.longitude,
        },
      }),
      // Add camera info from video metadata if available
      ...(videoMetadata?.camera && { camera: videoMetadata.camera }),
      // Add camera info from EXIF if available (for images)
      ...(exifData?.make && exifData?.model && {
        camera: `${exifData.make} ${exifData.model}`,
      }),
      // Add dimensions if available from EXIF
      ...(exifData?.pixelXDimension && { width: exifData.pixelXDimension }),
      ...(exifData?.pixelYDimension && { height: exifData.pixelYDimension }),
    },

    tags: [], // Will be populated by admin during upload
    // File processing flags
    isScreenshot: isScreenshotFile,
    isEdited: isEditedFile,
    hasValidExif: !!exifData,
  };
  
  // Add source metadata for WhatsApp uploads
  if (uploadSource === 'whatsapp') {
    metadata.sourceMetadata = {
      // Will be populated when WhatsApp integration is added
    };
  }
  
  return {
    metadata,
    fileNaming,
    hash,
  };
}

/**
 * Extract video metadata including creation date using HTML5 video element
 * Note: Browser APIs have limited access to video metadata, especially creation dates
 */
async function extractVideoMetadataWithDate(file: File): Promise<{
  width?: number;
  height?: number;
  duration?: number;
  creationDate?: Date;
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.addEventListener('loadedmetadata', () => {
      const metadata = {
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        duration: video.duration || undefined,
        // Note: Browser APIs don't provide access to video creation date
        // We would need server-side processing with ffprobe or similar tools
        creationDate: undefined as Date | undefined,
      };
      
      // Try to extract creation date from file's lastModified as fallback
      // This is not the actual video creation date, but file system date
      if (file.lastModified) {
        const fileDate = new Date(file.lastModified);
        // Only use if it seems reasonable (not too old, not in future)
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        
        if (fileDate >= oneYearAgo && fileDate <= oneHourFromNow) {
          metadata.creationDate = fileDate;
        }
      }
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    });
    
    video.addEventListener('error', () => {
      uploadLogger.error('Failed to extract video metadata', { filename: file.name });
      URL.revokeObjectURL(url);
      resolve({});
    });
    
    video.src = url;
    video.load();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve({});
    }, 10000);
  });
}

/**
 * Extract video metadata using HTML5 video element
 */
export async function extractVideoMetadata(file: File): Promise<{
  width?: number;
  height?: number;
  duration?: number;
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.addEventListener('loadedmetadata', () => {
      const metadata = {
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        duration: video.duration || undefined,
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    });
    
    video.addEventListener('error', () => {
      uploadLogger.error('Failed to extract video metadata', { filename: file.name });
      URL.revokeObjectURL(url);
      resolve({});
    });
    
    video.src = url;
    video.load();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve({});
    }, 10000);
  });
}

/**
 * Validate and sanitize metadata before storage
 */
export function validateMetadata(metadata: MediaMetadata): {
  isValid: boolean;
  errors: string[];
  sanitized?: MediaMetadata;
} {
  const errors: string[] = [];
  
  // Required fields validation
  if (!metadata.filename) errors.push('Filename is required');
  if (!metadata.originalFilename) errors.push('Original filename is required');
  if (!metadata.uploadedBy) errors.push('Uploaded by is required');
  if (!metadata.takenAt) errors.push('Taken at date is required');
  if (!metadata.metadata?.size) errors.push('File size is required');
  if (!metadata.metadata?.hash) errors.push('File hash is required');
  
  // Type validation
  if (!['photo', 'video'].includes(metadata.type)) {
    errors.push('Type must be photo or video');
  }
  
  // Date validation
  const takenAtDate = new Date(metadata.takenAt);
  if (isNaN(takenAtDate.getTime())) {
    errors.push('Invalid taken at date');
  }
  
  // File size validation using type-specific limits
  if (metadata.metadata?.size) {
    const fileType = metadata.type === 'video' ? 'video/mp4' : 'image/jpeg'; // Use representative types
    if (!isFileSizeValid(metadata.metadata.size, fileType)) {
      errors.push(`File size exceeds ${getFileSizeLimitDisplay(fileType)} limit`);
    }
  }
  
  // GPS validation if present
  if (metadata.metadata?.location) {
    const { lat, lng } = metadata.metadata.location;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.push('Invalid GPS coordinates');
    }
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Sanitize the metadata
  const sanitized = sanitizeMetadata(metadata);
  
  return { isValid: true, errors: [], sanitized };
}

/**
 * Sanitize metadata by removing potentially harmful content
 */
function sanitizeMetadata(metadata: MediaMetadata): MediaMetadata {
  const sanitized = { ...metadata };
  
  // Sanitize string fields
  if (sanitized.originalFilename) {
    sanitized.originalFilename = sanitizeString(sanitized.originalFilename);
  }
  
  if (sanitized.metadata?.exif?.imageDescription) {
    sanitized.metadata.exif.imageDescription = sanitizeString(
      sanitized.metadata.exif.imageDescription
    );
  }
  
  if (sanitized.metadata?.exif?.userComment) {
    sanitized.metadata.exif.userComment = sanitizeString(
      sanitized.metadata.exif.userComment
    );
  }
  
  // Ensure arrays are valid
  sanitized.tags = Array.isArray(sanitized.tags) ? sanitized.tags : [];
  
  return sanitized;
}

/**
 * Basic string sanitization
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .substring(0, 500); // Limit length
}

/**
 * Check if metadata indicates a WhatsApp photo
 */
export function isWhatsAppPhoto(metadata: MediaMetadata): boolean {
  // Check filename patterns
  const whatsappPatterns = [
    /^IMG-\d{8}-WA\d{4}/, // WhatsApp image pattern
    /^VID-\d{8}-WA\d{4}/, // WhatsApp video pattern
  ];
  
  const hasWhatsAppFilename = whatsappPatterns.some(pattern =>
    pattern.test(metadata.originalFilename)
  );
  
  // Check upload source
  const hasWhatsAppSource = metadata.uploadSource === 'whatsapp';
  
  // Check EXIF software field
  const hasWhatsAppExif = metadata.metadata?.exif?.software?.toLowerCase().includes('whatsapp');
  
  return hasWhatsAppFilename || hasWhatsAppSource || !!hasWhatsAppExif;
}

/**
 * Extract probable subject information from filename or metadata
 */
export function extractProbableSubjects(metadata: MediaMetadata): string[] {
  const subjects: string[] = [];
  
  // Check filename for subject hints
  const filename = metadata.originalFilename.toLowerCase();
  
  // Family member name patterns
  if (filename.includes('rufina') || filename.includes('rufi')) {
    subjects.push('rufina');
  }
  
  if (filename.includes('bernabe') || filename.includes('berna')) {
    subjects.push('bernabe');
  }
  
  // Remove duplicates and return
  return [...new Set(subjects)];
}

 