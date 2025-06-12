/**
 * EXIF metadata extracted from images
 */
export interface ExifMetadata {
  // Date and time information
  dateTimeOriginal?: Date;
  dateTime?: Date;
  dateTimeDigitized?: Date;
  
  // Camera information
  make?: string;
  model?: string;
  lens?: string;
  software?: string;
  
  // Technical settings
  fNumber?: number;
  exposureTime?: string;
  iso?: number;
  focalLength?: number;
  whiteBalance?: string;
  flash?: string;
  
  // Location information
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  
  // Image properties
  orientation?: number;
  colorSpace?: string;
  pixelXDimension?: number;
  pixelYDimension?: number;
  
  // Additional metadata
  artist?: string;
  copyright?: string;
  imageDescription?: string;
  userComment?: string;
}

/**
 * Date processing result with fallback strategies
 */
export interface DateProcessingResult {
  takenAt: Date;
  dateSource: 'exif' | 'filename' | 'file-creation' | 'upload-time';
  timezone?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Duplicate detection result
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingMedia?: MediaMetadata;
  hash: string;
}

/**
 * File naming result
 */
export interface FileNamingResult {
  filename: string;
  path: string;
  thumbnailPath?: string;
}

/**
 * Media metadata interface
 */
export interface MediaMetadata {
  id: string;
  filename: string;
  originalFilename: string; // Store original name separately
  path: string;
  type: 'photo' | 'video';
  uploadedBy: string;
  uploadedAt: string;
  uploadSource: 'web' | 'whatsapp' | 'email';
  sourceMetadata?: {
    whatsappSender?: string;
    caption?: string;
  };
  takenAt: string;
  dateInfo: {
    source: 'exif' | 'filename' | 'file-creation' | 'upload-time';
    timezone?: string;
    confidence: 'high' | 'medium' | 'low';
  };
  metadata: {
    width?: number;
    height?: number;
    duration?: number; // For videos
    size: number;
    camera?: string;
    location?: { lat: number; lng: number };
    // Enhanced metadata from EXIF
    exif?: ExifMetadata;
    hash: string; // For duplicate detection
    // Video-specific metadata
    videoCodec?: string;
    audioCodec?: string;
    bitrate?: number;
    framerate?: number;
  };
  tags: string[];
  thumbnailPath?: string;
  // File processing flags
  isScreenshot?: boolean;
  isEdited?: boolean;
  hasValidExif?: boolean;
  // Video processing flags
  thumbnailGenerated?: boolean;
  videoProcessingFailed?: boolean;
}

/**
 * Media database structure for a year
 */
export interface MediaYearData {
  media: MediaMetadata[];
}

/**
 * Media index to track which years have data
 */
export interface MediaIndex {
  years: number[];
  lastUpdated: string;
  totalMedia: number;
}

/**
 * User database structure
 */
export interface UserData {
  id: string;
  email: string;
  role: 'admin' | 'family' | 'extended-family' | 'friend' | 'guest';
  name: string;
  provider: string;
  created: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'suspended';
}

/**
 * Users database structure
 */
export interface UsersData {
  users: Record<string, UserData>;
}

/**
 * Configuration database structure
 */
export interface ConfigData {
  tags: string[];
}

/**
 * Upload job status
 */
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Upload job metadata
 */
export interface UploadJobMetadata {
  size: number;
  originalName: string;
  uploadedBy: string;
}

/**
 * File type validation result
 */
export interface FileValidation {
  isValid: boolean;
  type: 'image' | 'video' | 'unknown';
  error?: string;
} 