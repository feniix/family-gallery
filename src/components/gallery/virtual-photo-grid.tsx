'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { PhotoCardWrapper } from './photo-card-wrapper';
import { PhotoGridSkeleton } from '@/components/ui/image-skeleton';
import { MediaMetadata } from '@/types/media';
import { toast } from 'sonner';
import { 
  PerformanceMonitor, 
  MediaMemoryManager, 
  VirtualScrollCalculator,
  createOptimizedScrollHandler,
  createResizeHandler,
  getLoadingStrategy 
} from '@/lib/performance';
import { dbLogger } from '@/lib/logger';
import { authenticatedFetch } from '@/lib/api-client';

interface VirtualPhotoGridProps {
  onPhotoClick: (media: MediaMetadata, index: number) => void;
  onMediaUpdate?: (media: MediaMetadata[]) => void;
  enableVirtualScrolling?: boolean;
}

interface GridDimensions {
  columns: number;
  itemWidth: number;
  itemHeight: number;
  gap: number;
}

export function VirtualPhotoGrid({ 
  onPhotoClick, 
  onMediaUpdate,
  enableVirtualScrolling = false 
}: VirtualPhotoGridProps) {
  const [media, setMedia] = useState<MediaMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);
  const [gridDimensions, setGridDimensions] = useState<GridDimensions>({
    columns: 4,
    itemWidth: 200,
    itemHeight: 240,
    gap: 16
  });

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const performanceMonitor = useRef(PerformanceMonitor.getInstance());
  const memoryManager = useRef(MediaMemoryManager.getInstance());
  const virtualScrollCalculator = useRef<VirtualScrollCalculator | null>(null);

  // Get loading strategy based on device performance
  const loadingStrategy = useMemo(() => getLoadingStrategy(), []);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: `${loadingStrategy.preloadDistance}px`,
  });

  // Calculate grid layout based on container width
  const calculateGridDimensions = useCallback((containerWidth: number): GridDimensions => {
    const gap = 16;
    let columns = 2;

    if (containerWidth >= 1200) columns = 5;
    else if (containerWidth >= 1024) columns = 4;
    else if (containerWidth >= 768) columns = 3;
    else if (containerWidth >= 640) columns = 2;

    const itemWidth = (containerWidth - (gap * (columns + 1))) / columns;
    const itemHeight = itemWidth * 1.2; // Aspect ratio for cards with metadata

    return { columns, itemWidth, itemHeight, gap };
  }, []);

  // Initialize virtual scrolling
  useEffect(() => {
    if (enableVirtualScrolling && gridDimensions.itemHeight > 0) {
      virtualScrollCalculator.current = new VirtualScrollCalculator({
        containerHeight,
        itemHeight: gridDimensions.itemHeight + gridDimensions.gap,
        overscan: 2,
        bufferSize: loadingStrategy.initialBatchSize * 3
      });
    }
  }, [enableVirtualScrolling, containerHeight, gridDimensions, loadingStrategy.initialBatchSize]);

  // Handle container resize
  useEffect(() => {
    const handleResize = createResizeHandler(() => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setGridDimensions(calculateGridDimensions(containerWidth));
        setContainerHeight(containerRef.current.clientHeight);
      }
    });

    window.addEventListener('resize', handleResize);
    
    // Initial calculation
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      setGridDimensions(calculateGridDimensions(containerWidth));
      setContainerHeight(containerRef.current.clientHeight);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [calculateGridDimensions]);

  // Optimized scroll handler
  useEffect(() => {
    if (!enableVirtualScrolling || !containerRef.current) return;

    const handleScroll = createOptimizedScrollHandler((scrollTop) => {
      setScrollTop(scrollTop);
    });

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [enableVirtualScrolling]);

  // Calculate visible items for virtual scrolling
  const visibleItems = useMemo(() => {
    if (!enableVirtualScrolling || !virtualScrollCalculator.current) {
      return {
        items: media,
        paddingTop: 0,
        paddingBottom: 0
      };
    }

    const totalRows = Math.ceil(media.length / gridDimensions.columns);
    const range = virtualScrollCalculator.current.calculateVisibleRange(scrollTop, totalRows);

    const startIndex = range.start * gridDimensions.columns;
    const endIndex = Math.min(range.end * gridDimensions.columns, media.length);

    return {
      items: media.slice(startIndex, endIndex),
      paddingTop: range.paddingTop,
      paddingBottom: range.paddingBottom,
      startIndex
    };
  }, [enableVirtualScrolling, media, scrollTop, gridDimensions]);

  // Memory management
  useEffect(() => {
    const checkMemory = () => {
      const memoryCheck = performanceMonitor.current.checkMemoryUsage();
      if (memoryCheck.needsCleanup && memoryManager.current) {
        dbLogger.warn('High memory usage detected, triggering cleanup', {
          memoryUsage: memoryCheck.usage
        })
        memoryManager.current.clearCache();
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Preload images for visible items
  useEffect(() => {
    if (visibleItems.items.length > 0) {
      const priorityIndexes = Array.from({ length: Math.min(8, visibleItems.items.length) }, (_, i) => i);
      memoryManager.current.preloadImages(visibleItems.items, priorityIndexes);
    }
  }, [visibleItems.items]);

  // Initial load
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const loadInitial = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      
      const startTime = performance.now();
      
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
        
        performanceMonitor.current.logPerformance('initialLoad', startTime);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading photos');
        toast.error('Failed to load photos');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };
    
    loadInitial();
  }, [onMediaUpdate, loadingStrategy.initialBatchSize]);

  // Load more items
  useEffect(() => {
    if (!inView || !hasMore || loading || loadingMore || loadingRef.current) return;
    
    const loadMore = async () => {
      loadingRef.current = true;
      setLoadingMore(true);
      
      const startTime = performance.now();
      
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
        
        performanceMonitor.current.logPerformance('loadMore', startTime);
        
      } catch {
        toast.error('Failed to load more photos');
      } finally {
        setLoadingMore(false);
        loadingRef.current = false;
      }
    };
    
    loadMore();
  }, [inView, hasMore, loading, loadingMore, onMediaUpdate, loadingStrategy.batchSize]);

  // Handle photo click with global index correction
  const handlePhotoClick = useCallback((clickedMedia: MediaMetadata, localIndex: number) => {
    const globalIndex = enableVirtualScrolling && visibleItems.startIndex !== undefined 
      ? visibleItems.startIndex + localIndex 
      : localIndex;
    onPhotoClick(clickedMedia, globalIndex);
  }, [onPhotoClick, enableVirtualScrolling, visibleItems.startIndex]);

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

  const containerStyle = enableVirtualScrolling ? {
    height: '70vh',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const
  } : {};

  const itemsToRender = enableVirtualScrolling ? visibleItems.items : media;

  return (
    <div className="space-y-6">
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground">
          Virtual: {enableVirtualScrolling ? 'ON' : 'OFF'} | 
          Items: {itemsToRender.length}/{media.length} | 
          Cached: {memoryManager.current.getCacheStats().totalCached}
        </div>
      )}

      {/* Photo Grid Container */}
      <div 
        ref={containerRef}
        style={containerStyle}
        className={enableVirtualScrolling ? 'border rounded-lg' : ''}
      >
        {/* Virtual scroll padding top */}
        {enableVirtualScrolling && visibleItems.paddingTop > 0 && (
          <div style={{ height: visibleItems.paddingTop }} />
        )}

        {/* Photo Grid */}
        <div 
          ref={gridRef}
          className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4"
          style={{
            padding: enableVirtualScrolling ? '16px' : '0'
          }}
        >
          {itemsToRender.map((item, index) => (
            <div key={item.id} className="break-inside-avoid mb-4">
              <PhotoCardWrapper
                media={item}
                onClick={() => handlePhotoClick(item, index)}
                priority={index < 8} // Prioritize first 8 images
                aspectRatio="natural"
              />
            </div>
          ))}
        </div>

        {/* Virtual scroll padding bottom */}
        {enableVirtualScrolling && visibleItems.paddingBottom > 0 && (
          <div style={{ height: visibleItems.paddingBottom }} />
        )}

        {/* Loading States */}
        {loading && (
          <div className={enableVirtualScrolling ? 'px-4' : ''}>
            <PhotoGridSkeleton count={loadingStrategy.initialBatchSize} />
          </div>
        )}

        {loadingMore && (
          <div className={enableVirtualScrolling ? 'px-4' : ''}>
            <PhotoGridSkeleton count={Math.min(4, loadingStrategy.batchSize)} />
          </div>
        )}

        {/* Load More Trigger - only for non-virtual scrolling */}
        {!enableVirtualScrolling && hasMore && !loading && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            <div className="text-sm text-muted-foreground">
              {loadingMore ? 'Loading more photos...' : 'Scroll to load more'}
            </div>
          </div>
        )}
      </div>

      {/* Load More Trigger for virtual scrolling */}
      {enableVirtualScrolling && hasMore && !loading && (
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