'use client';

import React, { useEffect, useRef } from 'react';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import { MediaMetadata } from '@/types/media';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { getVideoMimeType } from '@/lib/video-processing';

interface EnhancedLightboxProps {
  media: MediaMetadata;
  allMedia: MediaMetadata[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function EnhancedLightbox({
  media,
  allMedia,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious
}: EnhancedLightboxProps) {
  const pswpRef = useRef<HTMLDivElement>(null);
  const pswpInstanceRef = useRef<PhotoSwipe | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen || !pswpRef.current) return;

    // Prepare PhotoSwipe items
    const items = allMedia.map((item) => {
      if (item.type === 'video') {
        // For videos, we'll use the thumbnail for PhotoSwipe
        return {
          src: `/api/media/download/${item.id}/thumbnail`,
          width: item.metadata?.width || 800,
          height: item.metadata?.height || 600,
          alt: item.originalFilename,
          isVideo: true,
          videoData: item
        };
      } else {
        return {
          src: `/api/media/download/${item.id}`,
          width: item.metadata?.width || 800,
          height: item.metadata?.height || 600,
          alt: item.originalFilename,
          isVideo: false,
          mediaData: item
        };
      }
    });

    const options = {
      dataSource: items,
      index: currentIndex,
      bgOpacity: 0.9,
      spacing: 0.1,
      allowPanToNext: true,
      wheelToZoom: true,
      pinchToClose: false,
      closeOnVerticalDrag: true,
      padding: { top: 60, bottom: 60, left: 40, right: 40 },
      preloadFirstSlide: true,
      loop: false,
    };

    pswpInstanceRef.current = new PhotoSwipe(options);
    
    // Handle slide change
    pswpInstanceRef.current.on('change', () => {
      const pswp = pswpInstanceRef.current;
      if (!pswp) return;
      
      const newIndex = pswp.currIndex;
      if (newIndex !== currentIndex) {
        if (newIndex > currentIndex) {
          onNext();
        } else {
          onPrevious();
        }
      }
    });

    // Handle close
    pswpInstanceRef.current.on('close', () => {
      onClose();
    });

    // Initialize and open
    pswpInstanceRef.current.init();

    return () => {
      if (pswpInstanceRef.current) {
        pswpInstanceRef.current.destroy();
        pswpInstanceRef.current = null;
      }
    };
  }, [isOpen, currentIndex, allMedia, onNext, onPrevious, onClose]);

  // Hide PhotoSwipe when video is playing to prevent interference
  useEffect(() => {
    if (!pswpInstanceRef.current) return;
    
    const pswpElement = pswpRef.current;
    if (!pswpElement) return;
    
    if (media?.type === 'video') {
      // Hide PhotoSwipe UI to prevent interference with video controls
      pswpElement.style.visibility = 'hidden';
      pswpElement.style.pointerEvents = 'none';
    } else {
      // Show PhotoSwipe UI for images
      pswpElement.style.visibility = 'visible';
      pswpElement.style.pointerEvents = 'auto';
    }
  }, [media?.type]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrevious();
          break;
        case 'ArrowRight':
          onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrevious]);

  if (!isOpen) return null;

  return (
    <>
      {/* PhotoSwipe container - hide when video is displayed */}
      <div 
        ref={pswpRef}
        className={`pswp ${media?.type === 'video' ? 'hidden' : ''}`}
        tabIndex={-1} 
        role="dialog" 
        aria-hidden="true"
      >
        <div className="pswp__bg"></div>
        <div className="pswp__scroll-wrap">
          <div className="pswp__container">
            <div className="pswp__item"></div>
            <div className="pswp__item"></div>
            <div className="pswp__item"></div>
          </div>
          
          {/* UI overlay */}
          <div className="pswp__ui pswp__ui--hidden">
            <div className="pswp__top-bar">
              <div className="pswp__counter"></div>
              <button className="pswp__button pswp__button--close" title="Close"></button>
              <button className="pswp__button pswp__button--zoom" title="Zoom in/out"></button>
              <div className="pswp__preloader">
                <div className="pswp__preloader__icn">
                  <div className="pswp__preloader__cut">
                    <div className="pswp__preloader__donut"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pswp__share-modal pswp__share-modal--hidden pswp__single-tap">
              <div className="pswp__share-tooltip"></div>
            </div>
            <button className="pswp__button pswp__button--arrow--left" title="Previous"></button>
            <button className="pswp__button pswp__button--arrow--right" title="Next"></button>
            <div className="pswp__caption">
              <div className="pswp__caption__center"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom metadata overlay - hide when video is displayed */}
      <div className={`pswp__metadata fixed bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg z-[2000] ${media?.type === 'video' ? 'hidden' : ''}`}>
        {media && (
          <div className="space-y-2 text-sm">
            <div className="font-semibold">{media.originalFilename}</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-300">Taken:</span> {format(new Date(media.takenAt), 'PPpp')}
              </div>
              <div>
                <span className="text-gray-300">Size:</span> {Math.round((media.metadata?.size || 0) / 1024 / 1024 * 100) / 100} MB
              </div>
              {media.metadata?.width && media.metadata?.height && (
                <div>
                  <span className="text-gray-300">Dimensions:</span> {media.metadata.width} × {media.metadata.height}
                </div>
              )}
              {media.metadata?.camera && (
                <div>
                  <span className="text-gray-300">Camera:</span> {media.metadata.camera}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video player overlay for video files */}
      {media?.type === 'video' && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[2001]">
          <div className="relative w-full h-full max-w-4xl max-h-full">
            <video
              ref={videoRef}
              controls
              autoPlay
              className="w-full h-full object-contain"
              poster={`/api/media/download/${media.id}/thumbnail`}
            >
              <source src={`/api/media/download/${media.id}`} type={getVideoMimeType(media.originalFilename)} />
              {/* Fallback sources for better compatibility */}
              <source src={`/api/media/download/${media.id}`} type="video/mp4" />
              <source src={`/api/media/download/${media.id}`} type="video/webm" />
              Your browser does not support the video tag.
            </video>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Navigation buttons */}
            {currentIndex > 0 && (
              <button
                onClick={onPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
            )}
            
            {currentIndex < allMedia.length - 1 && (
              <button
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}