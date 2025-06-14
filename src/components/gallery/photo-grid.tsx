'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { PhotoCard } from './photo-card';
import { PhotoGridSkeleton } from '@/components/ui/image-skeleton';
import { MediaMetadata } from '@/types/media';
import { toast } from 'sonner';
import { 
  PerformanceMonitor, 
  MediaMemoryManager, 
  getLoadingStrategy 
} from '@/lib/performance';
import { dbLogger } from '@/lib/logger';
import { authenticatedFetch } from '@/lib/api-client';

interface PhotoGridProps {
  onPhotoClick: (media: MediaMetadata, index: number) => void;
  onMediaUpdate?: (media: MediaMetadata[]) => void;
  enablePerformanceOptimizations?: boolean;
}

export function PhotoGrid({ 
  onPhotoClick, 
  onMediaUpdate, 
  enablePerformanceOptimizations = true 
}: PhotoGridProps) {
  const [media, setMedia] = useState<MediaMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);
  const performanceMonitor = useRef(enablePerformanceOptimizations ? PerformanceMonitor.getInstance() : null);
  const memoryManager = useRef(enablePerformanceOptimizations ? MediaMemoryManager.getInstance() : null);

  // Get loading strategy based on device performance
  const loadingStrategy = enablePerformanceOptimizations ? getLoadingStrategy() : {
    initialBatchSize: 20,
    batchSize: 16,
    preloadDistance: 200
  };

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: `${loadingStrategy.preloadDistance}px`,
  });

  // Memory management
  useEffect(() => {
    if (!enablePerformanceOptimizations || !performanceMonitor.current) return;

    const checkMemory = () => {
      const memoryCheck = performanceMonitor.current!.checkMemoryUsage();
      if (memoryCheck.needsCleanup && memoryManager.current) {
        const usedMemory = memoryManager.current.getCacheStats().totalCached;
        const MEMORY_THRESHOLD = 1000000; // Define MEMORY_THRESHOLD
        if (usedMemory > MEMORY_THRESHOLD) {
          dbLogger.warn('High memory usage detected, triggering cleanup', { 
            usedMemory: Math.round(usedMemory), 
            threshold: MEMORY_THRESHOLD 
          });
          memoryManager.current.clearCache();
        }
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [enablePerformanceOptimizations]);

  // Preload images for better performance
  useEffect(() => {
    if (!enablePerformanceOptimizations || !memoryManager.current || media.length === 0) return;

    const priorityIndexes = Array.from({ length: Math.min(12, media.length) }, (_, i) => i);
    memoryManager.current.preloadImages(media, priorityIndexes);
  }, [media, enablePerformanceOptimizations]);

  // Initial load - only run once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const loadInitial = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      
      const startTime = enablePerformanceOptimizations ? performance.now() : 0;
      
      try {
        const response = await authenticatedFetch(`/api/media/all?limit=${loadingStrategy.initialBatchSize}&offset=0`);
        if (!response.ok) throw new Error('Failed to load');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const newMedia = data.media || [];
        setMedia(newMedia);
        offsetRef.current = newMedia.length;
        setHasMore(data.pagination.hasMore);
        onMediaUpdate?.(newMedia);
        
        if (enablePerformanceOptimizations && performanceMonitor.current) {
          performanceMonitor.current.logPerformance('initialLoad', startTime);
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading photos');
        toast.error('Failed to load photos');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };
    
    loadInitial();
  }, [onMediaUpdate, loadingStrategy.initialBatchSize, enablePerformanceOptimizations]);

  // Load more - separate effect for infinite scroll
  useEffect(() => {
    if (!inView || !hasMore || loading || loadingMore || loadingRef.current) return;
    
    const loadMore = async () => {
      loadingRef.current = true;
      setLoadingMore(true);
      
      const startTime = enablePerformanceOptimizations ? performance.now() : 0;
      
      try {
        const response = await authenticatedFetch(`/api/media/all?limit=${loadingStrategy.batchSize}&offset=${offsetRef.current}`);
        if (!response.ok) throw new Error('Failed to load more');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const newMedia = data.media || [];
        if (newMedia.length > 0) {
          setMedia(prev => {
            const updated = [...prev, ...newMedia];
            offsetRef.current = updated.length;
            onMediaUpdate?.(updated);
            return updated;
          });
        }
        setHasMore(data.pagination.hasMore);
        
        if (enablePerformanceOptimizations && performanceMonitor.current) {
          performanceMonitor.current.logPerformance('loadMore', startTime);
        }
        
      } catch {
        toast.error('Failed to load more photos');
      } finally {
        setLoadingMore(false);
        loadingRef.current = false;
      }
    };
    
    loadMore();
  }, [inView, hasMore, loading, loadingMore, onMediaUpdate, loadingStrategy.batchSize, enablePerformanceOptimizations]);

  // Error state
  if (error && media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">Failed to load photos</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!loading && media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-2">No photos found</p>
        <p className="text-sm text-muted-foreground">
          Upload some photos in the admin panel to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && enablePerformanceOptimizations && memoryManager.current && (
        <div className="text-xs text-muted-foreground">
          Performance: ON | 
          Items: {media.length} | 
          Cached: {memoryManager.current.getCacheStats().totalCached} | 
          Batch: {loadingStrategy.batchSize}
        </div>
      )}

      {/* Photo Grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {media.map((item, index) => (
          <div key={item.id} className="break-inside-avoid mb-4">
            <PhotoCard
              media={item}
              onClick={() => onPhotoClick(item, index)}
              priority={index < 8} // Prioritize first 8 images
              aspectRatio="natural"
            />
          </div>
        ))}
      </div>

      {/* Loading States */}
      {loading && (
        <PhotoGridSkeleton count={loadingStrategy.initialBatchSize} />
      )}

      {loadingMore && (
        <PhotoGridSkeleton count={Math.min(4, loadingStrategy.batchSize)} />
      )}

      {/* Load More Trigger */}
      {hasMore && !loading && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <div className="text-sm text-muted-foreground">
            {loadingMore ? 'Loading more photos...' : 'Scroll to load more'}
          </div>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && media.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            You&apos;ve reached the end! {media.length} photos loaded.
          </p>
        </div>
      )}
    </div>
  );
} 