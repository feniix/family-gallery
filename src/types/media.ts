/**
 * Media metadata interface
 */
export interface MediaMetadata {
  id: string;
  filename: string;
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
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    camera?: string;
    location?: { lat: number; lng: number };
  };
  subjects: string[];
  tags: string[];
  thumbnailPath?: string;
}

/**
 * Media database structure for a year
 */
export interface MediaYearData {
  media: MediaMetadata[];
}

/**
 * User database structure
 */
export interface UserData {
  email: string;
  role: 'admin' | 'user';
  name: string;
  provider: string;
  created: string;
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
  subjects: string[];
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