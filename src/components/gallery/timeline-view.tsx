'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { PhotoCard } from './photo-card';
import { DateHeader } from './date-header';
import { EnhancedLightbox } from './enhanced-lightbox';
import { PhotoGridSkeleton } from '@/components/ui/image-skeleton';
import { MediaMetadata } from '@/types/media';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface TimelineViewProps {
  onMediaUpdate?: (media: MediaMetadata[]) => void;
}

interface GroupedMedia {
  year: number;
  month: number;
  displayDate: string;
  media: MediaMetadata[];
}

export function TimelineView({ onMediaUpdate }: TimelineViewProps) {
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

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Group media by year and month
  const groupMediaByDate = (mediaList: MediaMetadata[]): GroupedMedia[] => {
    const groups: { [key: string]: GroupedMedia } = {};
    
    mediaList.forEach((item) => {
      try {
        const date = parseISO(item.takenAt);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;
        
        if (!groups[key]) {
          groups[key] = {
            year,
            month,
            displayDate: format(date, 'MMMM yyyy'),
            media: []
          };
        }
        
        groups[key].media.push(item);
      } catch {
        console.warn('Invalid date for media item:', item.id, item.takenAt);
        // Handle items with invalid dates - group them in "Unknown Date"
        const key = 'unknown';
        if (!groups[key]) {
          groups[key] = {
            year: 0,
            month: 0,
            displayDate: 'Unknown Date',
            media: []
          };
        }
        groups[key].media.push(item);
      }
    });

    // Sort groups by year and month (newest first)
    return Object.values(groups).sort((a, b) => {
      if (a.year === 0) return 1; // Unknown dates go to the end
      if (b.year === 0) return -1;
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  };

  // Initial load
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const loadInitial = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      
      try {
        const response = await fetch('/api/media/all?limit=50&offset=0');
        if (!response.ok) throw new Error('Failed to load');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const newMedia = data.media || [];
        setMedia(newMedia);
        setGroupedMedia(groupMediaByDate(newMedia));
        offsetRef.current = newMedia.length;
        setHasMore(data.pagination.hasMore);
        onMediaUpdate?.(newMedia);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading photos');
        toast.error('Failed to load photos');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };
    
    loadInitial();
  }, [onMediaUpdate]);

  // Load more
  useEffect(() => {
    if (!inView || !hasMore || loading || loadingMore || loadingRef.current) return;
    
    const loadMore = async () => {
      loadingRef.current = true;
      setLoadingMore(true);
      
      try {
        const response = await fetch(`/api/media/all?limit=50&offset=${offsetRef.current}`);
        if (!response.ok) throw new Error('Failed to load more');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const newMedia = data.media || [];
        if (newMedia.length > 0) {
          setMedia(prev => {
            const updated = [...prev, ...newMedia];
            setGroupedMedia(groupMediaByDate(updated));
            offsetRef.current = updated.length;
            onMediaUpdate?.(updated);
            return updated;
          });
        }
        setHasMore(data.pagination.hasMore);
        
      } catch {
        toast.error('Failed to load more photos');
      } finally {
        setLoadingMore(false);
        loadingRef.current = false;
      }
    };
    
    loadMore();
  }, [inView, hasMore, loading, loadingMore, onMediaUpdate]);

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
      {/* Timeline Groups */}
      {groupedMedia.map((group, groupIndex) => (
        <div key={`${group.year}-${group.month}`} className="space-y-4">
          <DateHeader 
            date={group.displayDate}
            count={group.media.length}
            year={group.year}
            month={group.month}
          />
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {group.media.map((item, photoIndex) => (
              <PhotoCard
                key={item.id}
                media={item}
                onClick={() => handlePhotoClick(item, groupIndex, photoIndex)}
                priority={groupIndex === 0 && photoIndex < 8} // Prioritize first group's first 8 images
              />
            ))}
          </div>
        </div>
      ))}

      {/* Loading States */}
      {loading && (
        <PhotoGridSkeleton count={20} />
      )}

      {loadingMore && (
        <PhotoGridSkeleton count={4} />
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
      {lightboxOpen && selectedMedia && (
        <EnhancedLightbox
          media={selectedMedia}
          allMedia={media}
          currentIndex={selectedIndex}
          isOpen={lightboxOpen}
          onClose={handleLightboxClose}
          onNext={handleLightboxNext}
          onPrevious={handleLightboxPrev}
        />
      )}
    </div>
  );
} 