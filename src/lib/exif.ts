import exifr from 'exifr';
import { ExifMetadata } from '@/types/media';

/**
 * Check if we're running on the server side
 */
function isServerSide(): boolean {
  return typeof window === 'undefined';
}

/**
 * EXIF extraction options for optimal performance
 */
const EXIF_OPTIONS = {
  // Essential fields for date extraction
  pick: [
    'DateTimeOriginal',
    'DateTime', 
    'DateTimeDigitized',
    'CreateDate',
    'ModifyDate',
    
    // Camera information
    'Make',
    'Model',
    'LensModel',
    'Software',
    
    // Technical settings
    'FNumber',
    'ExposureTime',
    'ISO',
    'FocalLength',
    'WhiteBalance',
    'Flash',
    
    // GPS location
    'GPSLatitude',
    'GPSLongitude',
    'GPSAltitude',
    'GPSLatitudeRef',
    'GPSLongitudeRef',
    
    // Image properties
    'Orientation',
    'ColorSpace',
    'PixelXDimension',
    'PixelYDimension',
    'ExifImageWidth',
    'ExifImageHeight',
    
    // Additional metadata
    'Artist',
    'Copyright',
    'ImageDescription',
    'UserComment',
  ],
  
  // Performance optimizations
  chunked: false,
  firstChunkSize: 40960, // 40KB should be enough for most EXIF data
  multiSegment: false,
  silentErrors: true,
};

/**
 * Extract EXIF metadata from an image file
 */
export async function extractExifMetadata(file: File): Promise<ExifMetadata | null> {
  try {
    // Skip EXIF extraction on server side for now
    // In Stage 2.3, we'll implement proper server-side EXIF extraction
    if (isServerSide()) {
      console.log(`Skipping EXIF extraction on server side for ${file.name}`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exifData = await (exifr as any).parse(file, EXIF_OPTIONS);
    
    if (!exifData) {
      console.log(`No EXIF data found in ${file.name}`);
      return null;
    }

    // Process GPS coordinates
    const gps = extractGpsCoordinates(exifData);
    
    // Process dates (convert strings to Date objects)
    const dates = extractDates(exifData);
    
    const metadata: ExifMetadata = {
      ...dates,
      
      // Camera information
      make: exifData.Make?.trim(),
      model: exifData.Model?.trim(),
      lens: exifData.LensModel?.trim(),
      software: exifData.Software?.trim(),
      
      // Technical settings
      fNumber: exifData.FNumber,
      exposureTime: formatExposureTime(exifData.ExposureTime),
      iso: exifData.ISO,
      focalLength: exifData.FocalLength,
      whiteBalance: exifData.WhiteBalance?.toString(),
      flash: formatFlash(exifData.Flash),
      
      // Location
      ...(gps && { gps }),
      
      // Image properties
      orientation: exifData.Orientation,
      colorSpace: exifData.ColorSpace?.toString(),
      pixelXDimension: exifData.PixelXDimension || exifData.ExifImageWidth,
      pixelYDimension: exifData.PixelYDimension || exifData.ExifImageHeight,
      
      // Additional metadata
      artist: exifData.Artist?.trim(),
      copyright: exifData.Copyright?.trim(),
      imageDescription: exifData.ImageDescription?.trim(),
      userComment: exifData.UserComment?.trim(),
    };

    // Remove undefined values
    return cleanMetadata(metadata);
    
  } catch (error) {
    console.error(`Failed to extract EXIF from ${file.name}:`, error);
    return null;
  }
}

/**
 * Extract EXIF metadata from a buffer (for server-side processing)
 * This will be implemented in Stage 2.3 when we add proper server-side EXIF processing
 */
export async function extractExifMetadataFromBuffer(
  buffer: ArrayBuffer, 
  filename: string
): Promise<ExifMetadata | null> {
  try {
    console.log(`Server-side EXIF extraction for ${filename} will be implemented in Stage 2.3`);
    
    // For now, return null to indicate no EXIF data
    // In Stage 2.3, we'll implement proper server-side EXIF extraction
    // using a different library or approach that works with Node.js
    return null;
    
  } catch (error) {
    console.error(`Failed to extract server-side EXIF from ${filename}:`, error);
    return null;
  }
}

/**
 * Extract and validate GPS coordinates from EXIF data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGpsCoordinates(exifData: any): { latitude: number; longitude: number; altitude?: number } | null {
  try {
    const lat = exifData.GPSLatitude;
    const lng = exifData.GPSLongitude;
    const latRef = exifData.GPSLatitudeRef;
    const lngRef = exifData.GPSLongitudeRef;
    
    if (!lat || !lng) {
      return null;
    }
    
    // Convert to decimal degrees if needed
    let latitude = typeof lat === 'number' ? lat : convertDMSToDD(lat);
    let longitude = typeof lng === 'number' ? lng : convertDMSToDD(lng);
    
    // Apply hemisphere references
    if (latRef === 'S') latitude = -latitude;
    if (lngRef === 'W') longitude = -longitude;
    
    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.warn('Invalid GPS coordinates:', { latitude, longitude });
      return null;
    }
    
    const result: { latitude: number; longitude: number; altitude?: number } = {
      latitude,
      longitude,
    };
    
    // Add altitude if available
    if (exifData.GPSAltitude && typeof exifData.GPSAltitude === 'number') {
      result.altitude = exifData.GPSAltitude;
    }
    
    return result;
    
  } catch (error) {
    console.error('Error processing GPS coordinates:', error);
    return null;
  }
}

/**
 * Convert DMS (Degrees, Minutes, Seconds) to decimal degrees
 */
function convertDMSToDD(dms: number[]): number {
  if (!Array.isArray(dms) || dms.length < 2) {
    return 0;
  }
  
  const [degrees, minutes, seconds = 0] = dms;
  return degrees + minutes / 60 + seconds / 3600;
}

/**
 * Extract all available date fields from EXIF data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDates(exifData: any): Partial<ExifMetadata> {
  const dates: Partial<ExifMetadata> = {};
  
  // Priority order: DateTimeOriginal > CreateDate > DateTime > DateTimeDigitized > ModifyDate
  const dateFields = [
    { field: 'DateTimeOriginal', key: 'dateTimeOriginal' as keyof ExifMetadata },
    { field: 'CreateDate', key: 'dateTimeOriginal' as keyof ExifMetadata },
    { field: 'DateTime', key: 'dateTime' as keyof ExifMetadata },
    { field: 'DateTimeDigitized', key: 'dateTimeDigitized' as keyof ExifMetadata },
    { field: 'ModifyDate', key: 'dateTime' as keyof ExifMetadata },
  ];
  
  for (const { field, key } of dateFields) {
    const dateValue = exifData[field];
    if (dateValue) {
      const parsedDate = parseExifDate(dateValue);
      if (parsedDate) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dates as any)[key] = parsedDate;
      }
    }
  }
  
  return dates;
}

/**
 * Parse various date formats from EXIF data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseExifDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      // Common EXIF date format: "2024:01:15 14:30:22"
      if (dateValue.match(/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/)) {
        const cleanDateString = dateValue.replace(/:/g, '-').replace(/-(\d{2}:\d{2}:\d{2})$/, ' $1');
        return new Date(cleanDateString);
      }
      
      // Try standard date parsing
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // If it's a number (timestamp)
    if (typeof dateValue === 'number') {
      return new Date(dateValue * 1000); // Assume Unix timestamp
    }
    
    console.warn('Unable to parse EXIF date:', dateValue);
    return null;
    
  } catch (error) {
    console.error('Error parsing EXIF date:', error);
    return null;
  }
}

/**
 * Format exposure time for display
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatExposureTime(exposureTime: any): string | undefined {
  if (!exposureTime) return undefined;
  
  if (typeof exposureTime === 'number') {
    if (exposureTime >= 1) {
      return `${exposureTime}s`;
    } else {
      const fraction = Math.round(1 / exposureTime);
      return `1/${fraction}s`;
    }
  }
  
  return exposureTime.toString();
}

/**
 * Format flash information for display
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatFlash(flash: any): string | undefined {
  if (flash === undefined || flash === null) return undefined;
  
  // Flash is often a number with bit flags
  if (typeof flash === 'number') {
    const flashModes = [];
    
    if (flash & 0x01) flashModes.push('Fired');
    if (flash & 0x02) flashModes.push('Return detected');
    if (flash & 0x04) flashModes.push('Return not detected');
    if (flash & 0x08) flashModes.push('Compulsory');
    if (flash & 0x10) flashModes.push('Auto');
    if (flash & 0x20) flashModes.push('No flash');
    if (flash & 0x40) flashModes.push('Red-eye reduction');
    
    return flashModes.length > 0 ? flashModes.join(', ') : 'Unknown';
  }
  
  return flash.toString();
}

/**
 * Remove undefined values from metadata object
 */
function cleanMetadata(metadata: ExifMetadata): ExifMetadata {
  const cleaned = {} as ExifMetadata;
  
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined && value !== null && value !== '') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cleaned as any)[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Check if a filename suggests it's a screenshot
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
 * Check if a filename suggests it's an edited photo
 */
export function isEditedPhoto(filename: string, exifData?: ExifMetadata): boolean {
  const editedPatterns = [
    /edited/i,
    /_edit/i,
    /_modified/i,
    /copy/i,
    /duplicate/i,
    /_\d+$/i, // Files ending with _1, _2, etc.
  ];
  
  const filenameEdited = editedPatterns.some(pattern => pattern.test(filename));
  
  // Check software used for editing
  const editingSoftware = [
    'adobe photoshop',
    'lightroom',
    'snapseed',
    'vsco',
    'instagram',
    'facetune',
  ];
  
  const softwareEdited = exifData?.software && 
    editingSoftware.some(software => 
      exifData.software!.toLowerCase().includes(software)
    );
  
  return filenameEdited || !!softwareEdited;
}

/**
 * Extract timezone from EXIF GPS coordinates (basic implementation)
 */
export function getTimezoneFromCoordinates(latitude: number, longitude: number): string | null {
  // Basic timezone estimation based on longitude
  // For a more accurate implementation, you'd use a timezone API or library
  const timeZoneOffset = Math.round(longitude / 15);
  
  if (timeZoneOffset >= -12 && timeZoneOffset <= 12) {
    const sign = timeZoneOffset >= 0 ? '+' : '';
    return `UTC${sign}${timeZoneOffset}`;
  }
  
  return null;
} 