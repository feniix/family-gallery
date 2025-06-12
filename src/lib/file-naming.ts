import { FileNamingResult } from '@/types/media';
import { uploadLogger } from './logger';
import { 
  sanitizeFilename, 
  getFileExtension
} from './utils/filename-patterns';

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
 * Extract date from WhatsApp filename patterns (legacy function - use shared utility instead)
 * @deprecated Use extractDateFromFilename from utils/filename-patterns.ts instead
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

// Re-export shared utilities for backward compatibility
export { 
  validateFilename, 
  detectFileSource, 
  sanitizeFilename,
  isScreenshot,
  isEditedPhoto
} from './utils/filename-patterns'; 