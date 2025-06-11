'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { PhotoCard } from './photo-card';
import { PhotoGridSkeleton } from '@/components/ui/image-skeleton';
import { MediaMetadata } from '@/types/media';
import { toast } from 'sonner';

interface PhotoGridProps {
  onPhotoClick: (media: MediaMetadata, index: number) => void;
  onMediaUpdate?: (media: MediaMetadata[]) => void;
}

export function PhotoGrid({ onPhotoClick, onMediaUpdate }: PhotoGridProps) {
  const [media, setMedia] = useState<MediaMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Initial load - only run once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const loadInitial = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      
      try {
        const response = await fetch('/api/media/all?limit=20&offset=0');
        if (!response.ok) throw new Error('Failed to load');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const newMedia = data.media || [];
        setMedia(newMedia);
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

  // Load more - separate effect for infinite scroll
  useEffect(() => {
    if (!inView || !hasMore || loading || loadingMore || loadingRef.current) return;
    
    const loadMore = async () => {
      loadingRef.current = true;
      setLoadingMore(true);
      
      try {
        const response = await fetch(`/api/media/all?limit=20&offset=${offsetRef.current}`);
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
        
      } catch {
        toast.error('Failed to load more photos');
      } finally {
        setLoadingMore(false);
        loadingRef.current = false;
      }
    };
    
    loadMore();
  }, [inView, hasMore, loading, loadingMore, onMediaUpdate]);

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
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {media.map((item, index) => (
          <PhotoCard
            key={item.id}
            media={item}
            onClick={() => onPhotoClick(item, index)}
            priority={index < 8} // Prioritize first 8 images
          />
        ))}
      </div>

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
    </div>
  );
} 