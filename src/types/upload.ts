import type { ExifMetadata } from './media';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  size: number;
}

export interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'duplicate-warning';
  progress: number;
  error?: string;
  presignedUrl?: string;
  filePath?: string;
  jobId?: string;
  // Duplicate detection fields
  isDuplicate?: boolean;
  duplicateInfo?: {
    existingFilename: string;
    existingId: string;
    existingDate: string;
  };
  hash?: string;
  // Client-side extracted EXIF data
  exifData?: ExifMetadata | null;
  exifExtracted?: boolean;
  // Video thumbnail and metadata
  videoThumbnail?: Blob | null;
  videoMetadata?: VideoMetadata;
} 