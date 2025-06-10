import { ExifMetadata, DateProcessingResult } from '@/types/media';
// Using basic date formatting instead of date-fns for now
function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Process date with comprehensive fallback strategies
 */
export async function processDateWithFallbacks(
  file: File,
  exifData?: ExifMetadata | null
): Promise<DateProcessingResult> {
  // Strategy 1: Use EXIF DateTimeOriginal (highest priority)
  if (exifData?.dateTimeOriginal) {
    return {
      takenAt: exifData.dateTimeOriginal,
      dateSource: 'exif',
      confidence: 'high',
      timezone: extractTimezoneFromExif(exifData),
    };
  }
  
  // Strategy 2: Use other EXIF date fields
  if (exifData?.dateTime) {
    return {
      takenAt: exifData.dateTime,
      dateSource: 'exif',
      confidence: 'medium',
      timezone: extractTimezoneFromExif(exifData),
    };
  }
  
  if (exifData?.dateTimeDigitized) {
    return {
      takenAt: exifData.dateTimeDigitized,
      dateSource: 'exif',
      confidence: 'medium',
      timezone: extractTimezoneFromExif(exifData),
    };
  }
  
  // Strategy 3: Extract date from filename
  const filenameDate = extractDateFromFilename(file.name);
  if (filenameDate) {
    return {
      takenAt: filenameDate,
      dateSource: 'filename',
      confidence: 'medium',
    };
  }
  
  // Strategy 4: Use file lastModified as fallback
  const fileDate = new Date(file.lastModified);
  if (!isNaN(fileDate.getTime()) && fileDate.getFullYear() > 2000) {
    return {
      takenAt: fileDate,
      dateSource: 'file-creation',
      confidence: 'low',
    };
  }
  
  // Strategy 5: Use current upload time as last resort
  return {
    takenAt: new Date(),
    dateSource: 'upload-time',
    confidence: 'low',
  };
}

/**
 * Extract timezone information from EXIF data
 */
function extractTimezoneFromExif(exifData: ExifMetadata): string | undefined {
  // If GPS coordinates are available, estimate timezone
  if (exifData.gps) {
    return estimateTimezoneFromCoordinates(exifData.gps.latitude, exifData.gps.longitude);
  }
  
  // Check for timezone offset in camera software or other fields
  // This is a basic implementation - could be enhanced with more sources
  return undefined;
}

/**
 * Estimate timezone from GPS coordinates
 */
function estimateTimezoneFromCoordinates(latitude: number, longitude: number): string {
  // Basic timezone estimation based on longitude
  // Each 15 degrees of longitude roughly equals 1 hour of time difference
  const timeZoneOffset = Math.round(longitude / 15);
  
  // Clamp to valid timezone range
  const clampedOffset = Math.max(-12, Math.min(12, timeZoneOffset));
  
  if (clampedOffset === 0) {
    return 'UTC';
  }
  
  const sign = clampedOffset >= 0 ? '+' : '';
  return `UTC${sign}${clampedOffset}`;
}

/**
 * Extract date from various filename patterns
 */
function extractDateFromFilename(filename: string): Date | null {
  const patterns = [
    // WhatsApp patterns: IMG-20240115-WA0001.jpg
    /IMG-(\d{4})(\d{2})(\d{2})-WA\d{4}/,
    /VID-(\d{4})(\d{2})(\d{2})-WA\d{4}/,
    
    // Screenshot patterns: Screenshot_20240115_143022.jpg
    /Screenshot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
    
    // Common camera patterns: IMG_20240115_143022.jpg
    /IMG_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
    /DSC_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
    
    // Date with dashes: 2024-01-15_14-30-22.jpg
    /(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/,
    
    // Simple date patterns: 20240115.jpg
    /(\d{4})(\d{2})(\d{2})/,
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      try {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JS months are 0-indexed
        const day = parseInt(match[3]);
        
        // Check if we have time components
        const hour = match[4] ? parseInt(match[4]) : 12;
        const minute = match[5] ? parseInt(match[5]) : 0;
        const second = match[6] ? parseInt(match[6]) : 0;
        
        const date = new Date(year, month, day, hour, minute, second);
        
        // Validate the date
        if (!isNaN(date.getTime()) && 
            year >= 2000 && year <= new Date().getFullYear() + 1 &&
            month >= 0 && month <= 11 &&
            day >= 1 && day <= 31) {
          
                     console.log(`Extracted date from filename ${filename}: ${formatDate(date)}`);
          return date;
        }
      } catch (error) {
        console.warn(`Failed to parse date from filename ${filename}:`, error);
      }
    }
  }
  
  return null;
}

/**
 * Validate if a date is reasonable for a photo/video
 */
export function isValidMediaDate(date: Date): boolean {
  const now = new Date();
  const minDate = new Date('2000-01-01'); // Reasonable minimum for digital photos
  const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Allow up to 1 day in future
  
  return date >= minDate && date <= maxDate;
}

/**
 * Normalize date to UTC for consistent storage
 */
export function normalizeDateToUTC(date: Date, timezone?: string): Date {
  if (!timezone || timezone === 'UTC') {
    return date;
  }
  
  // Basic timezone conversion - in a full implementation you'd use a proper timezone library
  const offsetMatch = timezone.match(/UTC([+-])(\d+)/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? -1 : 1; // Reverse for UTC conversion
    const hours = parseInt(offsetMatch[2]);
    const offsetMs = sign * hours * 60 * 60 * 1000;
    
    return new Date(date.getTime() + offsetMs);
  }
  
  return date;
}

/**
 * Handle missing date scenarios for different file types
 */
export function getDateFallbackStrategy(filename: string, fileType: string): {
  strategy: string;
  confidence: 'low' | 'medium';
} {
  const lowerName = filename.toLowerCase();
  
  // Screenshots often have creation date in filename
  if (lowerName.includes('screenshot') || lowerName.includes('screen')) {
    return { strategy: 'Use file creation time', confidence: 'medium' };
  }
  
  // WhatsApp files often have date in filename
  if (lowerName.includes('wa') || lowerName.match(/img-\d{8}/)) {
    return { strategy: 'Extract from WhatsApp filename pattern', confidence: 'medium' };
  }
  
  // Edited photos might use original file date
  if (lowerName.includes('edit') || lowerName.includes('copy')) {
    return { strategy: 'Use file modification time', confidence: 'low' };
  }
  
  // Videos often have reliable file creation times
  if (fileType.startsWith('video/')) {
    return { strategy: 'Use file creation time', confidence: 'medium' };
  }
  
  return { strategy: 'Use upload time', confidence: 'low' };
} 