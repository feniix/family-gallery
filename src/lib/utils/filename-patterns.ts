/**
 * Shared filename pattern utilities
 * Consolidates pattern matching logic used across the application
 */

export interface DateExtractionResult {
  date: Date;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

export interface FileSourceDetection {
  source: 'whatsapp' | 'screenshot' | 'camera' | 'edited' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Comprehensive filename patterns for date extraction
 */
export const FILENAME_PATTERNS = {
  // WhatsApp patterns: IMG-20240115-WA0001.jpg
  whatsapp: [
    /IMG-(\d{4})(\d{2})(\d{2})-WA\d{4}/,
    /VID-(\d{4})(\d{2})(\d{2})-WA\d{4}/,
    /AUD-(\d{4})(\d{2})(\d{2})-WA\d{4}/,
  ],
  
  // Screenshot patterns: Screenshot_20240115_143022.jpg
  screenshot: [
    /Screenshot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
    /screenshot[-_](\d{4})[-_](\d{2})[-_](\d{2})/i,
  ],
  
  // Common camera patterns: IMG_20240115_143022.jpg
  camera: [
    /IMG_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
    /DSC_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
    /^(dsc|img)_\d{8}_\d{6}/i,
  ],
  
  // Date with dashes: 2024-01-15_14-30-22.jpg
  dateFormat: [
    /(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/,
    /(\d{4})-(\d{2})-(\d{2})/,
  ],
  
  // Simple date patterns: 20240115.jpg
  simple: [
    /(\d{4})(\d{2})(\d{2})/,
  ],
} as const;

/**
 * Dangerous filename patterns for security validation
 */
export const DANGEROUS_PATTERNS = [
  /\.\./,           // Directory traversal
  /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
  /^\.+$/,          // Only dots
  /[<>:"/\\|?*\x00-\x1f]/g, // Invalid filesystem characters
] as const;

/**
 * Extract date from various filename patterns
 */
export function extractDateFromFilename(filename: string): DateExtractionResult | null {
  const allPatterns = [
    { patterns: FILENAME_PATTERNS.whatsapp, source: 'whatsapp', confidence: 'high' as const },
    { patterns: FILENAME_PATTERNS.screenshot, source: 'screenshot', confidence: 'high' as const },
    { patterns: FILENAME_PATTERNS.camera, source: 'camera', confidence: 'medium' as const },
    { patterns: FILENAME_PATTERNS.dateFormat, source: 'filename-date', confidence: 'medium' as const },
    { patterns: FILENAME_PATTERNS.simple, source: 'simple-date', confidence: 'low' as const },
  ];
  
  for (const { patterns, source, confidence } of allPatterns) {
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
            
            return {
              date,
              confidence,
              source
            };
          }
        } catch {
          // Continue to next pattern on parse error
        }
      }
    }
  }
  
  return null;
}

/**
 * Detect file source based on filename patterns
 */
export function detectFileSource(filename: string): FileSourceDetection {
  const lowerName = filename.toLowerCase();
  
  // WhatsApp patterns
  if (FILENAME_PATTERNS.whatsapp.some(pattern => pattern.test(filename))) {
    return { source: 'whatsapp', confidence: 'high' };
  }
  
  // Screenshot patterns
  if (/screenshot/i.test(lowerName) || /screen.?shot/i.test(lowerName)) {
    return { source: 'screenshot', confidence: 'high' };
  }
  
  // Camera patterns
  if (FILENAME_PATTERNS.camera.some(pattern => pattern.test(filename))) {
    return { source: 'camera', confidence: 'medium' };
  }
  
  // Edited photo patterns
  if (/(edit|copy|modified)/.test(lowerName) || /_\d+$/.test(removeExtension(lowerName))) {
    return { source: 'edited', confidence: 'medium' };
  }
  
  return { source: 'unknown', confidence: 'low' };
}

/**
 * Sanitize filename to remove invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove or replace invalid characters for file systems
    .replace(DANGEROUS_PATTERNS[3], '_')
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
  
  // Check for dangerous patterns (excluding the character replacement one)
  const dangerousPatterns = DANGEROUS_PATTERNS.slice(0, 3);
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
 * Remove file extension from filename
 */
function removeExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : '';
}

/**
 * Check if filename suggests it's a screenshot
 */
export function isScreenshot(filename: string): boolean {
  const screenshotPatterns = [
    /screenshot/i,
    /screen.?shot/i,
    /capture/i,
    /^img_\d{8}_\d{6}$/i, // WhatsApp screenshot pattern
    /^screenshot_\d/i,
    /^screen\d/i,
  ];
  
  return screenshotPatterns.some(pattern => pattern.test(filename));
}

/**
 * Check if filename suggests it's an edited photo
 */
export function isEditedPhoto(filename: string): boolean {
  const editedPatterns = [
    /edited/i,
    /_edit/i,
    /_modified/i,
    /copy/i,
    /duplicate/i,
    /_\d+$/i, // Files ending with _1, _2, etc.
  ];
  
  return editedPatterns.some(pattern => pattern.test(filename));
} 