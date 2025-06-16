import { useState } from 'react';
import { MediaMetadata } from '@/types/media';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

interface PhotoCardProps {
  media: MediaMetadata;
  onClick: () => void;
  priority?: boolean;
  aspectRatio?: 'natural' | 'square' | '4/3' | '3/2' | '16/9';
}

export function PhotoCard({ media, onClick, priority = false, aspectRatio = 'natural' }: PhotoCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Lazy loading with intersection observer
  const { ref: intersectionRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px', // Start loading 100px before entering viewport
    triggerOnce: true // Only load once when first visible
  });
  
  // Get signed URL for thumbnail - only when visible or priority
  const { url: thumbnailUrl, loading: thumbnailLoading, error: thumbnailError } = useSignedUrl({
    mediaId: media.id,
    isThumbnail: true,
    expiresIn: 3600, // 1 hour
    enabled: priority || isIntersecting // Load immediately if priority, otherwise when visible
  });



  const isVideo = media.type === 'video';

  // Calculate aspect ratio class or style
  const getAspectRatioConfig = () => {
    if (aspectRatio === 'natural') {
      if (media.metadata?.width && media.metadata?.height) {
        // Use the actual aspect ratio from metadata
        const ratio = media.metadata.width / media.metadata.height;
        return {
          useInlineStyle: true,
          style: { aspectRatio: ratio.toString() }
        };
      } else {
        // If natural is requested but no metadata, don't constrain aspect ratio
        // Let the image determine its natural size within the container
        return {
          useInlineStyle: false,
          className: '' // No aspect ratio constraint
        };
      }
    }
    
    // Use predefined aspect ratio classes
    const aspectClass = (() => {
      switch (aspectRatio) {
        case 'square':
          return 'aspect-square';
        case '4/3':
          return 'aspect-[4/3]';
        case '3/2':
          return 'aspect-[3/2]';
        case '16/9':
          return 'aspect-[16/9]';
        default:
          return 'aspect-[4/3]';
      }
    })();
    
    return {
      useInlineStyle: false,
      className: aspectClass
    };
  };

  const aspectConfig = getAspectRatioConfig();

  // Show loading state while fetching signed URL
  if (thumbnailLoading) {
    return (
      <div 
        className={`relative overflow-hidden rounded-lg bg-gray-200 animate-pulse cursor-pointer ${
          aspectConfig.useInlineStyle ? '' : aspectConfig.className
        }`}
        style={aspectConfig.useInlineStyle ? aspectConfig.style : undefined}
        onClick={onClick}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show error state if signed URL failed to load
  if (thumbnailError || !thumbnailUrl) {
    const errorMessage = thumbnailError || 'No URL available';
    const isAuthError = thumbnailError?.includes('401') || thumbnailError?.includes('403');
    const isServerError = thumbnailError?.includes('500') || thumbnailError?.includes('502') || thumbnailError?.includes('503');
    
    return (
      <div 
        className={`relative overflow-hidden rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 cursor-pointer ${
          aspectConfig.useInlineStyle ? '' : aspectConfig.className
        }`}
        style={aspectConfig.useInlineStyle ? aspectConfig.style : undefined}
        onClick={onClick}
        title={`Error: ${errorMessage}`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-xs text-center px-2">
            {isAuthError ? 'Access denied' : isServerError ? 'Server error' : 'Failed to load'}
          </span>
          {process.env.NODE_ENV === 'development' && (
            <span className="text-xs text-center px-2 mt-1 text-red-500">
              {errorMessage}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={intersectionRef}
      className={`relative overflow-hidden rounded-lg bg-gray-100 cursor-pointer group ${
        aspectConfig.useInlineStyle ? '' : aspectConfig.className
      }`}
      style={aspectConfig.useInlineStyle ? aspectConfig.style : undefined}
      onClick={onClick}
    >
      {/* Main Image - Use regular img tag for signed URLs to bypass Next.js image optimization */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl}
        alt={media.originalFilename}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        loading={priority ? 'eager' : 'lazy'}
        onError={(e) => {
          // Prevent the default error logging that shows empty object
          e.preventDefault();
          
          const target = e.target as HTMLImageElement;
          const errorDetails = {
            mediaId: media.id,
            src: thumbnailUrl,
            filename: media.originalFilename,
            errorType: e.type || 'error',
            tagName: target?.tagName || 'IMG',
            currentSrc: target?.currentSrc || thumbnailUrl || 'unknown',
            naturalWidth: target?.naturalWidth || 0,
            naturalHeight: target?.naturalHeight || 0,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 100)
          };
          
          // Use a more specific console method to avoid Next.js error interception
          console.warn('🖼️ Image failed to load:', errorDetails);
          
          // Set error state to show fallback UI
          setImageError(true);
          
          // In development, provide additional debugging info
          if (process.env.NODE_ENV === 'development') {
            console.warn('🔍 Debug info: Signed URL may have expired, CORS issue, or network problem. Check R2 configuration and network tab.');
            
            // Try to provide more context about the error
            if (thumbnailUrl?.includes('X-Amz-Expires')) {
              console.warn('🕒 This appears to be a signed URL - check if it has expired');
            }
            if (!thumbnailUrl) {
              console.warn('❌ No thumbnail URL available - check signed URL generation');
            }
          }
        }}
        crossOrigin="anonymous" // Important for CORS with signed URLs
      />

      {/* Video Play Overlay */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-200">
          <div className="bg-white bg-opacity-90 rounded-full p-3 group-hover:scale-110 transition-transform duration-200">
            <svg 
              className="w-6 h-6 text-gray-800" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Duration Badge for Videos */}
      {isVideo && media.metadata?.duration && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {formatDuration(media.metadata.duration)}
        </div>
      )}

      {/* Error Overlay */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format video duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `0:${remainingSeconds.toString().padStart(2, '0')}`;
  }
} 