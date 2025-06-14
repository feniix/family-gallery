import { useEffect, useRef } from 'react';
import { MediaMetadata } from '@/types/media';
import { preloadSignedUrls } from './use-signed-url';

interface UseSmartPreloadingOptions {
  allMedia: MediaMetadata[];
  currentIndex: number;
  preloadCount?: number;
  enabled?: boolean;
}

export function useSmartPreloading({
  allMedia,
  currentIndex,
  preloadCount = 10,
  enabled = true
}: UseSmartPreloadingOptions) {
  const preloadedRanges = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || allMedia.length === 0) return;

    const preloadRange = async () => {
      // Calculate preload range around current index
      const startIndex = Math.max(0, currentIndex - Math.floor(preloadCount / 2));
      const endIndex = Math.min(allMedia.length - 1, currentIndex + Math.floor(preloadCount / 2));
      
      // Create range key for tracking
      const rangeKey = `${startIndex}-${endIndex}`;
      
      // Skip if this range was already preloaded
      if (preloadedRanges.current.has(rangeKey)) {
        return;
      }

      // Get media IDs in the range
      const mediaToPreload = allMedia.slice(startIndex, endIndex + 1);
      const thumbnailIds = mediaToPreload.map(media => media.id);
      
      // Preload thumbnails for the range
      if (thumbnailIds.length > 0) {
        try {
          await preloadSignedUrls(thumbnailIds, { 
            isThumbnail: true,
            expiresIn: 3600 // 1 hour for thumbnails
          });
          
          // Mark this range as preloaded
          preloadedRanges.current.add(rangeKey);
          
          // Clean up old ranges to prevent memory bloat
          if (preloadedRanges.current.size > 10) {
            const oldestRange = preloadedRanges.current.values().next().value;
            if (oldestRange) {
              preloadedRanges.current.delete(oldestRange);
            }
          }
        } catch (error) {
          console.warn('Failed to preload thumbnails:', error);
        }
      }
    };

    // Debounce preloading to avoid excessive API calls
    const timeoutId = setTimeout(preloadRange, 100);
    
    return () => clearTimeout(timeoutId);
  }, [allMedia, currentIndex, preloadCount, enabled]);

  // Preload full images for immediate neighbors
  useEffect(() => {
    if (!enabled || allMedia.length === 0) return;

    const preloadFullImages = async () => {
      const neighborsToPreload: string[] = [];
      
      // Current image
      if (allMedia[currentIndex]) {
        neighborsToPreload.push(allMedia[currentIndex].id);
      }
      
      // Previous image
      if (currentIndex > 0 && allMedia[currentIndex - 1]) {
        neighborsToPreload.push(allMedia[currentIndex - 1].id);
      }
      
      // Next image
      if (currentIndex < allMedia.length - 1 && allMedia[currentIndex + 1]) {
        neighborsToPreload.push(allMedia[currentIndex + 1].id);
      }

      if (neighborsToPreload.length > 0) {
        try {
          await preloadSignedUrls(neighborsToPreload, { 
            isThumbnail: false,
            expiresIn: 7200 // 2 hours for full images
          });
        } catch (error) {
          console.warn('Failed to preload full images:', error);
        }
      }
    };

    // Debounce full image preloading
    const timeoutId = setTimeout(preloadFullImages, 200);
    
    return () => clearTimeout(timeoutId);
  }, [allMedia, currentIndex, enabled]);
}

// Hook for preloading next page in infinite scroll scenarios
export function useNextPagePreloading(
  getNextPageMediaIds: () => string[],
  shouldPreload: boolean,
  enabled: boolean = true
) {
  const preloadedPages = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !shouldPreload) return;

    const preloadNextPage = async () => {
      try {
        const nextPageIds = getNextPageMediaIds();
        
        if (nextPageIds.length === 0) return;
        
        // Create a key for this page
        const pageKey = nextPageIds.join(',');
        
        // Skip if already preloaded
        if (preloadedPages.current.has(pageKey)) return;
        
        // Preload thumbnails for next page
        await preloadSignedUrls(nextPageIds, { 
          isThumbnail: true,
          expiresIn: 3600
        });
        
        // Mark as preloaded
        preloadedPages.current.add(pageKey);
        
        // Clean up old page keys
        if (preloadedPages.current.size > 5) {
          const oldestPage = preloadedPages.current.values().next().value;
          if (oldestPage) {
            preloadedPages.current.delete(oldestPage);
          }
        }
      } catch (error) {
        console.warn('Failed to preload next page:', error);
      }
    };

    // Debounce next page preloading
    const timeoutId = setTimeout(preloadNextPage, 500);
    
    return () => clearTimeout(timeoutId);
  }, [getNextPageMediaIds, shouldPreload, enabled]);
} 