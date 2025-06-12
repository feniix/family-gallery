import { FileNamingResult } from '@/types/media';
import { uploadLogger } from './logger';

/**
 * Generate unique filename and path based on date
 */
export function generateUniqueFilename(originalFilename: string, takenAt: Date): FileNamingResult {
  const yearMonth = `${takenAt.getFullYear()}/${String(takenAt.getMonth() + 1).padStart(2, '0')}`;
  uploadLogger.debug('Generating filename', { 
    originalFilename, 
    takenAt: takenAt.toISOString(), 
    yearMonth 
  });
  
  const year = takenAt.getFullYear();
  const month = String(takenAt.getMonth() + 1).padStart(2, '0');
  const timestamp = Math.floor(takenAt.getTime() / 1000);
  
  // Extract file extension
  const extension = getFileExtension(originalFilename);
  
  // Clean the original filename for use in new name
  const cleanOriginalName = sanitizeFilename(originalFilename);
  const baseName = removeExtension(cleanOriginalName);
  
  // Generate unique filename with timestamp
  const filename = `${timestamp}_${baseName}.${extension}`;
  
  // Generate path: year/month/filename
  const path = `${year}/${month}/${filename}`;
  
  // Generate thumbnail path for images
  const thumbnailPath = generateThumbnailPath(path, extension);
  
  return {
    filename,
    path,
    thumbnailPath,
  };
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  
  return filename.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * Remove extension from filename
 */
function removeExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return filename;
  }
  
  return filename.substring(0, lastDotIndex);
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    // Remove or replace invalid characters for file systems
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    // Remove multiple consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores and dots
    .replace(/^[_.]+|[_.]+$/g, '')
    // Limit length
    .substring(0, 100)
    // Ensure we have something
    || 'file';
}

/**
 * Generate thumbnail path for supported image formats
 */
function generateThumbnailPath(originalPath: string, extension: string): string | undefined {
  // Only generate thumbnail paths for supported image formats
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'dng'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
  
  if (imageExtensions.includes(extension) || videoExtensions.includes(extension)) {
    // Replace extension with .jpg for thumbnails
    const pathWithoutExt = originalPath.substring(0, originalPath.lastIndexOf('.'));
    return `thumbnails/${pathWithoutExt}_thumb.jpg`;
  }
  
  return undefined;
}

/**
 * Generate a unique ID for media items
 */
export function generateMediaId(): string {
  // Generate a unique ID using timestamp and random string
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  
  return `${timestamp}_${randomStr}`;
}

/**
 * Validate filename for security and compatibility
 */
export function validateFilename(filename: string): {
  isValid: boolean;
  errors: string[];
  sanitized: string;
} {
  const errors: string[] = [];
  
  // Check length
  if (filename.length === 0) {
    errors.push('Filename cannot be empty');
  }
  
  if (filename.length > 255) {
    errors.push('Filename too long (max 255 characters)');
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /\.\./,           // Directory traversal
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    /^\.+$/,          // Only dots
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(filename)) {
      errors.push('Filename contains invalid patterns');
      break;
    }
  }
  
  // Sanitize the filename
  const sanitized = sanitizeFilename(filename);
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Extract date from WhatsApp filename patterns
 */
export function extractDateFromWhatsAppFilename(filename: string): Date | null {
  // WhatsApp patterns: IMG-20240115-WA0001.jpg, VID-20240115-WA0001.mp4
  const whatsappPattern = /(IMG|VID)-(\d{4})(\d{2})(\d{2})-WA\d{4}/;
  const match = filename.match(whatsappPattern);
  
  if (match) {
    const year = parseInt(match[2]);
    const month = parseInt(match[3]) - 1; // JS months are 0-indexed
    const day = parseInt(match[4]);
    
    const date = new Date(year, month, day);
    
    // Validate the extracted date
    if (!isNaN(date.getTime()) && 
        year >= 2000 && year <= new Date().getFullYear() + 1) {
      return date;
    }
  }
  
  return null;
}

/**
 * Check if filename follows specific patterns that might indicate the source
 */
export function detectFileSource(filename: string): {
  source: 'whatsapp' | 'screenshot' | 'camera' | 'edited' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
} {
  const lowerName = filename.toLowerCase();
  
  // WhatsApp patterns
  if (/^(img|vid)-\d{8}-wa\d{4}/i.test(filename)) {
    return { source: 'whatsapp', confidence: 'high' };
  }
  
  // Screenshot patterns
  if (/screenshot/i.test(lowerName) || /screen.?shot/i.test(lowerName)) {
    return { source: 'screenshot', confidence: 'high' };
  }
  
  // Camera patterns
  if (/^(dsc|img)_\d{8}_\d{6}/i.test(filename)) {
    return { source: 'camera', confidence: 'medium' };
  }
  
  // Edited photo patterns
  if (/(edit|copy|modified)/.test(lowerName) || /_\d+$/.test(removeExtension(lowerName))) {
    return { source: 'edited', confidence: 'medium' };
  }
  
  return { source: 'unknown', confidence: 'low' };
}

/**
 * Generate storage path structure for organizing files
 */
export function generateStoragePath(date: Date, type: 'originals' | 'thumbnails' | 'web-optimized'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  return `${type}/${year}/${month}`;
}

/**
 * Create JSON database path for metadata storage
 */
export function getMetadataJsonPath(date: Date): string {
  const year = date.getFullYear();
  return `media/${year}.json`;
} 