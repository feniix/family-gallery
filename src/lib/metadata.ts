import { MediaMetadata, ExifMetadata, FileNamingResult } from '@/types/media';
import { extractExifMetadata, isScreenshot, isEditedPhoto } from './exif';
import { processDateWithFallbacks } from './date-handling';
import { generateUniqueFilename } from './file-naming';
import CryptoJS from 'crypto-js';

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
  console.log(`Processing metadata for ${file.name}`);
  
  // Generate file hash for duplicate detection
  const hash = await generateFileHash(file);
  
  // Use pre-extracted EXIF data if provided, otherwise extract it
  let exifData: ExifMetadata | null = null;
  if (preExtractedExifData !== undefined) {
    exifData = preExtractedExifData;
    console.log(`Using pre-extracted EXIF data for ${file.name}:`, {
      hasData: !!exifData,
      hasDate: !!exifData?.dateTimeOriginal,
      camera: exifData?.make && exifData?.model ? `${exifData.make} ${exifData.model}` : 'Unknown'
    });
  } else if (file.type.startsWith('image/')) {
    exifData = await extractExifMetadata(file);
  }
  
  // Process date with fallback strategies
  const dateResult = await processDateWithFallbacks(file, exifData || undefined);
  
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
      // Add GPS location if available in EXIF
      ...(exifData?.gps && {
        location: {
          lat: exifData.gps.latitude,
          lng: exifData.gps.longitude,
        },
      }),
      // Add camera info if available
      ...(exifData?.make && exifData?.model && {
        camera: `${exifData.make} ${exifData.model}`,
      }),
      // Add dimensions if available
      ...(exifData?.pixelXDimension && { width: exifData.pixelXDimension }),
      ...(exifData?.pixelYDimension && { height: exifData.pixelYDimension }),
    },
    subjects: [], // Will be populated by admin during upload
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
 * Generate SHA-256 hash of file content for duplicate detection
 */
async function generateFileHash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const hash = CryptoJS.SHA256(wordArray).toString();
    
    console.log(`Generated hash for ${file.name}: ${hash.substring(0, 16)}...`);
    return hash;
  } catch (error) {
    console.error('Error generating file hash:', error);
    // Fallback: use file properties
    return CryptoJS.SHA256(`${file.name}_${file.size}_${file.lastModified}`).toString();
  }
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
      console.error('Failed to extract video metadata');
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
  
  // File size validation (max 50MB)
  if (metadata.metadata?.size && metadata.metadata.size > 50 * 1024 * 1024) {
    errors.push('File size exceeds 50MB limit');
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
  sanitized.subjects = Array.isArray(sanitized.subjects) ? sanitized.subjects : [];
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