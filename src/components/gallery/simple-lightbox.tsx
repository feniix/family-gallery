import { useState, useEffect } from 'react';
import { MediaMetadata } from '@/types/media';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { useSmartPreloading } from '@/hooks/use-smart-preloading';
import { createLogger } from '@/lib/logger';

const lightboxLogger = createLogger('LIGHTBOX');

interface SimpleLightboxProps {
  media: MediaMetadata;
  allMedia: MediaMetadata[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export function SimpleLightbox({
  media,
  allMedia,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious
}: SimpleLightboxProps) {
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Get signed URLs for current media
  const { url: fullImageUrl, loading: fullImageLoading, error: fullImageError } = useSignedUrl({
    mediaId: media?.id || '',
    isThumbnail: false,
    expiresIn: 7200, // 2 hours for full images
    enabled: isOpen && !!media?.id
  });

  const { url: thumbnailUrl } = useSignedUrl({
    mediaId: media?.id || '',
    isThumbnail: true,
    expiresIn: 3600, // 1 hour for thumbnails
    enabled: isOpen && media?.type === 'video' && !!media?.id
  });

  // Smart preloading for lightbox navigation
  useSmartPreloading({
    allMedia,
    currentIndex,
    preloadCount: 6, // Preload 3 images before and after current
    enabled: isOpen
  });

  // Calculate image dimensions and aspect ratio
  useEffect(() => {
    if (!isOpen || !media) return;

    setImageLoading(true);
    setImageDimensions(null);

    // Use metadata if available
    if (media.metadata?.width && media.metadata?.height) {
      const aspectRatio = media.metadata.width / media.metadata.height;
      lightboxLogger.debug('Using metadata dimensions', { 
        filename: media.originalFilename,
        width: media.metadata.width,
        height: media.metadata.height,
        aspectRatio: aspectRatio.toFixed(2)
      });
      setImageDimensions({
        width: media.metadata.width,
        height: media.metadata.height,
        aspectRatio
      });
      setImageLoading(false);
    } else if (fullImageUrl && media.type === 'photo') {
      // If no metadata, load image to get natural dimensions
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        lightboxLogger.debug('Auto-detected dimensions', { 
          filename: media.originalFilename,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: aspectRatio.toFixed(2)
        });
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio
        });
        setImageLoading(false);
      };
      
      img.onerror = () => {
        lightboxLogger.warn('Failed to load image dimensions, using fallback', { 
          filename: media.originalFilename 
        });
        setImageDimensions({
          width: 800,
          height: 600,
          aspectRatio: 4/3
        });
        setImageLoading(false);
      };

      img.src = fullImageUrl;
    } else {
      // Fallback dimensions
      setImageDimensions({
        width: 800,
        height: 600,
        aspectRatio: 4/3
      });
      setImageLoading(false);
    }
  }, [media, isOpen, fullImageUrl]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) onPrevious();
          break;
        case 'ArrowRight':
          if (currentIndex < allMedia.length - 1) onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, allMedia.length, onClose, onNext, onPrevious]);

  if (!isOpen || !media) return null;

  const isVideo = media.type === 'video';

  // Calculate container dimensions to fit within viewport
  const getContainerStyle = () => {
    if (!imageDimensions) return {};

    const maxWidth = Math.min(window.innerWidth * 0.9, 1600);
    const maxHeight = Math.min(window.innerHeight * 0.8, 1200);
    
    let { width, height } = imageDimensions;
    
    // Scale down if too large
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return {
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: '90vw',
      maxHeight: '80vh'
    };
  };

  const containerStyle = getContainerStyle();

  const getVideoMimeType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      case 'webm': return 'video/webm';
      default: return 'video/mp4';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
        aria-label="Close lightbox"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors"
          aria-label="Previous image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {currentIndex < allMedia.length - 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors"
          aria-label="Next image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main content area */}
      <div className="flex items-center justify-center w-full h-full p-8">
        {/* Loading state */}
        {(fullImageLoading || imageLoading) && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {/* Error state */}
        {fullImageError && !fullImageLoading && (
          <div className="text-center text-white">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg mb-2">Failed to load media</p>
            <p className="text-sm text-gray-400">{media.originalFilename}</p>
          </div>
        )}

        {/* Media content */}
        {!fullImageLoading && !fullImageError && fullImageUrl && (
          <>
            {isVideo ? (
              <video
                controls
                autoPlay
                className="max-w-full max-h-full object-contain"
                poster={thumbnailUrl || undefined}
              >
                <source src={fullImageUrl} type={getVideoMimeType(media.originalFilename)} />
                <source src={fullImageUrl} type="video/mp4" />
                <source src={fullImageUrl} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div 
                className="relative flex items-center justify-center"
                style={containerStyle}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fullImageUrl}
                  alt={media.originalFilename}
                  className="object-contain w-full h-full"
                  style={{
                    aspectRatio: imageDimensions?.aspectRatio || 'auto'
                  }}
                  onLoad={() => setImageLoading(false)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Metadata Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
        <div className="text-white">
          <h3 className="text-lg font-medium mb-2">{media.originalFilename}</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-300">
            <span>{new Date(media.takenAt).toLocaleDateString()}</span>
            {media.metadata?.width && media.metadata?.height && (
              <span>{media.metadata.width} × {media.metadata.height}</span>
            )}
            {media.metadata?.size && (
              <span>{(media.metadata.size / 1024 / 1024).toFixed(1)} MB</span>
            )}
            {isVideo && media.metadata?.duration && (
              <span>{Math.round(media.metadata.duration)}s</span>
            )}
          </div>
          {media.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {media.tags.map(tag => (
                <span key={tag} className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image counter */}
      <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
        {currentIndex + 1} of {allMedia.length}
      </div>
    </div>
  );
} 