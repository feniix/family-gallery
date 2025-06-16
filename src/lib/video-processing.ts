/**
 * Video processing utilities for client-side thumbnail generation and metadata extraction
 */

import { videoLogger } from './logger';

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  size: number;
  // Note: Enhanced metadata fields are no longer available since MediaInfo.js has been removed
}

interface ThumbnailGenerationResult {
  thumbnail: Blob | null;
  metadata: VideoMetadata;
  error?: string;
  fallbackUsed: boolean;
}

interface VideoProcessingOptions {
  thumbnailTime?: number; // Time in seconds to capture thumbnail (default: 2s or 10% of duration)
  thumbnailWidth?: number; // Max width for thumbnail (default: 320)
  thumbnailHeight?: number; // Max height for thumbnail (default: 240)
  thumbnailQuality?: number; // JPEG quality 0-1 (default: 0.8)
  timeout?: number; // Processing timeout in ms (default: 30000)
}

/**
 * Check if browser supports video processing
 */
async function checkBrowserCompatibility(): Promise<boolean> {
  try {
    // Check for required APIs
    if (!HTMLVideoElement || !HTMLCanvasElement || !CanvasRenderingContext2D) {
      return false;
    }

    // Check for createObjectURL support
    if (!URL || !URL.createObjectURL) {
      return false;
    }

    // Test canvas toBlob support
    const canvas = document.createElement('canvas');
    if (!canvas.getContext || !canvas.toBlob) {
      return false;
    }

    return true;
  } catch (error) {
    videoLogger.warn('Browser compatibility check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

/**
 * Extract video metadata using HTML5 video element
 */
export async function extractVideoMetadataWithMediaInfo(
  videoFile: File,
  options: VideoProcessingOptions = {}
): Promise<VideoMetadata> {
  // MediaInfo.js has been removed - using HTML5 video element for all video processing
  videoLogger.info('Using HTML5 video element for metadata extraction', {
    filename: videoFile.name
  });
  
  return extractVideoMetadata(videoFile, options);
}

/**
 * Extract video metadata from file
 */
async function extractVideoMetadata(
  videoFile: File,
  options: VideoProcessingOptions = {}
): Promise<VideoMetadata> {
  const { timeout = 30000 } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Video metadata extraction timeout'));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
    };

    const handleLoadedMetadata = () => {
      try {
        const metadata: VideoMetadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: videoFile.size,
        };

        cleanup();
        resolve(metadata);
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to extract video metadata: ${error instanceof Error ? error.message : String(error)}`));
      }
    };

    const handleError = () => {
      cleanup();
      reject(new Error('Failed to load video for metadata extraction'));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    try {
      video.src = URL.createObjectURL(videoFile);
      video.load();
    } catch (error) {
      cleanup();
      reject(new Error(`Failed to create object URL: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}

/**
 * Generate thumbnail from video file
 */
export async function generateVideoThumbnail(
  videoFile: File,
  options: VideoProcessingOptions = {}
): Promise<ThumbnailGenerationResult> {
  const {
    thumbnailTime,
    thumbnailWidth = 320,
    thumbnailHeight = 240,
    thumbnailQuality = 0.8,
    timeout = 30000,
  } = options;

  // Check browser compatibility first
  const browserCompatible = await checkBrowserCompatibility();
  if (!browserCompatible) {
    const metadata = await extractVideoMetadata(videoFile, options);
    return {
      thumbnail: null,
      metadata,
      error: 'Browser does not support video thumbnail generation',
      fallbackUsed: true,
    };
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const timeoutId = setTimeout(() => {
      cleanup();
      handleFallback('Thumbnail generation timeout');
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
    };

    const handleFallback = async (errorMessage: string) => {
      try {
        const metadata = await extractVideoMetadata(videoFile, options);
        resolve({
          thumbnail: null,
          metadata,
          error: errorMessage,
          fallbackUsed: true,
        });
      } catch (metadataError) {
        resolve({
          thumbnail: null,
          metadata: {
            duration: 0,
            width: 0,
            height: 0,
            size: videoFile.size,
          },
          error: `${errorMessage}; Metadata extraction also failed: ${metadataError instanceof Error ? metadataError.message : String(metadataError)}`,
          fallbackUsed: true,
        });
      }
    };

    const handleLoadedMetadata = async () => {
      try {
        const metadata: VideoMetadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: videoFile.size,
        };

        // Calculate thumbnail capture time
        const captureTime = thumbnailTime !== undefined 
          ? Math.min(thumbnailTime, video.duration - 0.1)
          : Math.min(2, video.duration * 0.1);

        // Set up canvas
        const aspectRatio = video.videoWidth / video.videoHeight;
        let canvasWidth = thumbnailWidth;
        let canvasHeight = thumbnailHeight;

        // Maintain aspect ratio
        if (aspectRatio > 1) {
          canvasHeight = canvasWidth / aspectRatio;
        } else {
          canvasWidth = canvasHeight * aspectRatio;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          await handleFallback('Canvas context not available');
          return;
        }

        // Seek to capture time
        video.currentTime = captureTime;

        const handleSeeked = () => {
          try {
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

            // Convert to blob
            canvas.toBlob(
              (blob) => {
                cleanup();
                resolve({
                  thumbnail: blob,
                  metadata,
                  fallbackUsed: false,
                });
              },
              'image/jpeg',
              thumbnailQuality
            );
          } catch (error) {
            cleanup();
            handleFallback(`Failed to generate thumbnail: ${error instanceof Error ? error.message : String(error)}`);
          }
        };

        const handleSeekError = () => {
          cleanup();
          handleFallback('Failed to seek to thumbnail position');
        };

        video.addEventListener('seeked', handleSeeked, { once: true });
        video.addEventListener('error', handleSeekError, { once: true });

      } catch (error) {
        cleanup();
        await handleFallback(`Metadata processing failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    const handleVideoError = () => {
      cleanup();
      handleFallback('Failed to load video file');
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleVideoError);

    // Configure video element
    video.preload = 'metadata';
    video.muted = true; // Required for autoplay in some browsers

    try {
      video.src = URL.createObjectURL(videoFile);
      video.load();
    } catch (error) {
      cleanup();
      handleFallback(`Failed to create object URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/**
 * Validate video file format
 */
export function validateVideoFile(file: File): {
  isValid: boolean;
  codec?: string;
  error?: string;
} {
  const validMimeTypes = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo', // AVI
    'video/webm',
    'video/ogg',
  ];

  const validExtensions = ['.mp4', '.mov', '.avi', '.webm', '.ogv'];

  // Check MIME type
  if (!validMimeTypes.includes(file.type)) {
    // Check extension as fallback
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `Unsupported video format: ${file.type || extension}`,
      };
    }
  }

  // Detect codec from MIME type
  let codec: string | undefined;
  if (file.type.includes('mp4')) {
    codec = 'H.264/H.265';
  } else if (file.type.includes('quicktime')) {
    codec = 'QuickTime';
  } else if (file.type.includes('webm')) {
    codec = 'VP8/VP9';
  }

  return {
    isValid: true,
    codec,
  };
}

/**
 * Process video file completely (metadata + thumbnail)
 */
export async function processVideoFile(
  videoFile: File,
  options: VideoProcessingOptions = {}
): Promise<{
  metadata: VideoMetadata;
  thumbnail: Blob | null;
  thumbnailError?: string;
  isValid: boolean;
  validationError?: string;
}> {
  // Validate file first
  const validation = validateVideoFile(videoFile);
  if (!validation.isValid) {
    return {
      metadata: {
        duration: 0,
        width: 0,
        height: 0,
        size: videoFile.size,
      },
      thumbnail: null,
      isValid: false,
      validationError: validation.error,
    };
  }

  try {
    // Generate thumbnail and extract metadata
    const result = await generateVideoThumbnail(videoFile, options);
    
    return {
      metadata: result.metadata,
      thumbnail: result.thumbnail,
      thumbnailError: result.error,
      isValid: true,
    };
  } catch (error) {
    // Fallback to metadata only
    try {
      const metadata = await extractVideoMetadata(videoFile, options);
      return {
        metadata,
        thumbnail: null,
        thumbnailError: `Thumbnail generation failed: ${error instanceof Error ? error.message : String(error)}`,
        isValid: true,
      };
    } catch (metadataError) {
      return {
        metadata: {
          duration: 0,
          width: 0,
          height: 0,
          size: videoFile.size,
        },
        thumbnail: null,
        thumbnailError: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
        isValid: false,
        validationError: `Metadata extraction failed: ${metadataError instanceof Error ? metadataError.message : String(metadataError)}`,
      };
    }
  }
}

/**
 * Format video duration for display
 */
export function formatVideoDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Get video file icon based on format
 */
export function getVideoFileIcon(file: File): string {
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  switch (extension) {
    case '.mp4':
      return '🎬';
    case '.mov':
      return '🎥';
    case '.avi':
      return '📹';
    case '.webm':
      return '🎞️';
    default:
      return '📺';
  }
}

/**
 * Get MIME type for video file based on filename extension
 */
export function getVideoMimeType(filename: string): string {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  switch (extension) {
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.avi':
      return 'video/x-msvideo';
    case '.webm':
      return 'video/webm';
    case '.ogv':
      return 'video/ogg';
    default:
      return 'video/mp4'; // Default fallback
  }
} 