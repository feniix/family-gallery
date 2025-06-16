'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { PhotoCard } from './photo-card';
import { DateHeader } from './date-header';
import { SimpleLightbox } from './simple-lightbox';
import { PhotoGridSkeleton } from '@/components/ui/image-skeleton';
import { MediaMetadata } from '@/types/media';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  PerformanceMonitor, 
  MediaMemoryManager, 
  getLoadingStrategy 
} from '@/lib/performance';
import { dbLogger } from '@/lib/logger';
import { authenticatedFetch } from '@/lib/api-client';

interface TimelineViewProps {
  onMediaUpdate?: (media: MediaMetadata[]) => void;
  enablePerformanceOptimizations?: boolean;
}

interface GroupedMedia {
  year: number;
  month: number;
  displayDate: string;
  media: MediaMetadata[];
}

export function TimelineView({ 
  onMediaUpdate,
  enablePerformanceOptimizations = true 
}: TimelineViewProps) {
  const [media, setMedia] = useState<MediaMetadata[]>([]);
  const [groupedMedia, setGroupedMedia] = useState<GroupedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaMetadata | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);
  const performanceMonitor = useRef(enablePerformanceOptimizations ? PerformanceMonitor.getInstance() : null);
  const memoryManager = useRef(enablePerformanceOptimizations ? MediaMemoryManager.getInstance() : null);

  // Get loading strategy based on device performance
  const loadingStrategy = enablePerformanceOptimizations ? getLoadingStrategy() : {
    initialBatchSize: 50,
    batchSize: 40,
    preloadDistance: 200
  };

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: `${loadingStrategy.preloadDistance}px`,
  });

  // Group media by date
  const groupMediaByDate = useCallback((mediaList: MediaMetadata[]): GroupedMedia[] => {
    const startTime = enablePerformanceOptimizations ? performance.now() : 0;
    
    const groups = new Map<string, MediaMetadata[]>();
    
    mediaList.forEach(item => {
      let date: Date;
      try {
        date = new Date(item.takenAt);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
      } catch {
        date = new Date(item.uploadedAt);
      }
      
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    
    const result = Array.from(groups.entries())
      .map(([key, items]) => {
        const [yearStr, monthStr] = key.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const date = new Date(year, month, 1);
        
        return {
          year,
          month,
          displayDate: format(date, 'MMMM yyyy'),
          media: items.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    if (enablePerformanceOptimizations && performanceMonitor.current) {
      performanceMonitor.current.logPerformance('groupMediaByDate', startTime);
    }

    return result;
  }, [enablePerformanceOptimizations, performanceMonitor]);

  // Memory management
  useEffect(() => {
    if (!enablePerformanceOptimizations || !performanceMonitor.current) return;

    const checkMemory = () => {
      const memoryCheck = performanceMonitor.current!.checkMemoryUsage();
      if (memoryCheck.needsCleanup && memoryManager.current) {
        dbLogger.warn('High memory usage detected, triggering cleanup', {
          memoryUsage: memoryCheck.usage
        });
        memoryManager.current.clearCache();
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [enablePerformanceOptimizations]);

  // Preload images for visible groups
  useEffect(() => {
    if (!enablePerformanceOptimizations || !memoryManager.current || groupedMedia.length === 0) return;

    // Preload first 2 groups (most recent)
    const priorityMedia = groupedMedia.slice(0, 2).flatMap(group => group.media);
    const priorityIndexes = Array.from({ length: Math.min(16, priorityMedia.length) }, (_, i) => i);
    memoryManager.current.preloadImages(priorityMedia, priorityIndexes);
  }, [groupedMedia, enablePerformanceOptimizations]);

  // Initial load
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
        setGroupedMedia(groupMediaByDate(newMedia));
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
  }, [onMediaUpdate, loadingStrategy.initialBatchSize, enablePerformanceOptimizations, groupMediaByDate]);

  // Load more
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
          const updatedMedia = [...media, ...newMedia];
          setMedia(updatedMedia);
          setGroupedMedia(groupMediaByDate(updatedMedia));
          offsetRef.current = updatedMedia.length;
          onMediaUpdate?.(updatedMedia);
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
  }, [inView, hasMore, loading, loadingMore, media, onMediaUpdate, loadingStrategy.batchSize, enablePerformanceOptimizations, groupMediaByDate]);

  const handlePhotoClick = (clickedMedia: MediaMetadata, groupIndex: number, photoIndex: number) => {
    // Calculate global index across all groups
    let globalIndex = 0;
    for (let i = 0; i < groupIndex; i++) {
      globalIndex += groupedMedia[i].media.length;
    }
    globalIndex += photoIndex;

    setSelectedMedia(clickedMedia);
    setSelectedIndex(globalIndex);
    setLightboxOpen(true);
  };

  const handleLightboxClose = () => {
    setLightboxOpen(false);
    setSelectedMedia(null);
  };

  const handleLightboxNext = () => {
    const nextIndex = selectedIndex + 1;
    if (nextIndex < media.length) {
      setSelectedIndex(nextIndex);
      setSelectedMedia(media[nextIndex]);
    }
  };

  const handleLightboxPrev = () => {
    const prevIndex = selectedIndex - 1;
    if (prevIndex >= 0) {
      setSelectedIndex(prevIndex);
      setSelectedMedia(media[prevIndex]);
    }
  };

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
    <div className="space-y-8">
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && enablePerformanceOptimizations && memoryManager.current && (
        <div className="text-xs text-muted-foreground">
          Performance: ON | 
          Items: {media.length} | 
          Groups: {groupedMedia.length} | 
          Cached: {memoryManager.current.getCacheStats().totalCached} | 
          Batch: {loadingStrategy.batchSize}
        </div>
      )}

      {/* Timeline Groups */}
      {groupedMedia.map((group, groupIndex) => (
        <div key={`${group.year}-${group.month}`} className="space-y-4">
          <DateHeader 
            date={group.displayDate}
            count={group.media.length}
            year={group.year}
            month={group.month}
          />
          
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {group.media.map((item, photoIndex) => (
              <div key={item.id} className="break-inside-avoid mb-4">
                                    <PhotoCard
                  media={item}
                  onClick={() => handlePhotoClick(item, groupIndex, photoIndex)}
                  priority={groupIndex === 0 && photoIndex < 8} // Prioritize first group's first 8 images
                  aspectRatio="natural"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Loading States */}
      {loading && (
        <PhotoGridSkeleton count={Math.min(20, loadingStrategy.initialBatchSize)} />
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

      {/* Enhanced Lightbox */}
      <SimpleLightbox
        media={selectedMedia!}
        allMedia={media}
        currentIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={handleLightboxClose}
        onNext={handleLightboxNext}
        onPrevious={handleLightboxPrev}
      />
    </div>
  );
} 