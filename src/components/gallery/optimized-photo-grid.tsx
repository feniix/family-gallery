import { useState, useEffect, useCallback, useMemo } from 'react';
import { MediaMetadata } from '@/types/media';
import { PhotoCardWrapper } from './photo-card-wrapper';
import { SimpleLightboxWrapper } from './simple-lightbox-wrapper';
import { useNextPagePreloading } from '@/hooks/use-smart-preloading';
import { r2Config } from '@/lib/config';

interface OptimizedPhotoGridProps {
  media: MediaMetadata[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  columns?: number;
  aspectRatio?: 'natural' | 'square' | '4/3' | '3/2' | '16/9';
  className?: string;
}

export function OptimizedPhotoGrid({
  media,
  onLoadMore,
  hasMore = false,
  loading = false,
  columns = 4,
  aspectRatio = '4/3',
  className = ''
}: OptimizedPhotoGridProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaMetadata | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Calculate grid layout
  const gridCols = useMemo(() => {
    switch (columns) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-2 md:grid-cols-3';
      case 4: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 5: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      case 6: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
      default: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    }
  }, [columns]);

  // Intersection observer for infinite scroll
  const [loadMoreTrigger, setLoadMoreTrigger] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loadMoreTrigger || !onLoadMore || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(loadMoreTrigger);
    return () => observer.unobserve(loadMoreTrigger);
  }, [loadMoreTrigger, onLoadMore, hasMore, loading]);

  // Smart preloading for next page (only if using signed URLs)
  const getNextPageMediaIds = useCallback(() => {
    // This would typically come from your pagination logic
    // For now, return empty array as we don't have next page data
    return [];
  }, []);

  const shouldPreloadNextPage = useMemo(() => {
    // Preload when user is near the end of current page
    return hasMore && media.length > 0;
  }, [hasMore, media.length]);

  useNextPagePreloading(
    getNextPageMediaIds,
    shouldPreloadNextPage,
    r2Config.useSignedUrls // Only preload if using signed URLs
  );

  // Handle media selection
  const handleMediaClick = useCallback((clickedMedia: MediaMetadata) => {
    const index = media.findIndex(m => m.id === clickedMedia.id);
    setSelectedMedia(clickedMedia);
    setCurrentIndex(index);
    setIsLightboxOpen(true);
  }, [media]);

  // Lightbox navigation
  const handleNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedMedia(media[nextIndex]);
    }
  }, [currentIndex, media]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setSelectedMedia(media[prevIndex]);
    }
  }, [currentIndex, media]);

  const handleCloseLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    setSelectedMedia(null);
  }, []);

  // Determine priority images (first few visible images)
  const priorityCount = Math.min(columns * 2, 8); // First 2 rows or max 8 images

  return (
    <div className={`w-full ${className}`}>
      {/* Photo Grid */}
      <div className={`grid ${gridCols} gap-2 md:gap-4`}>
        {media.map((mediaItem, index) => (
          <PhotoCardWrapper
            key={mediaItem.id}
            media={mediaItem}
            onClick={() => handleMediaClick(mediaItem)}
            priority={index < priorityCount} // Priority loading for first few images
            aspectRatio={aspectRatio}
          />
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading more photos...</span>
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && !loading && (
        <div
          ref={setLoadMoreTrigger}
          className="h-20 flex items-center justify-center"
        >
          <div className="text-gray-500 text-sm">Scroll for more photos</div>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && media.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>You've reached the end of the gallery</p>
          <p className="text-sm mt-1">{media.length} photos total</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && media.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
          <p className="text-gray-500">Try adjusting your search or upload some photos to get started.</p>
        </div>
      )}

      {/* Lightbox */}
      {selectedMedia && (
        <SimpleLightboxWrapper
          media={selectedMedia}
          allMedia={media}
          currentIndex={currentIndex}
          isOpen={isLightboxOpen}
          onClose={handleCloseLightbox}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
    </div>
  );
} 