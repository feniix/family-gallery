'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaMetadata } from '@/types/media';
import { format } from 'date-fns';
import { getVideoMimeType } from '@/lib/video-processing';
import { createLogger } from '@/lib/logger';

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

const lightboxLogger = createLogger('LIGHTBOX');

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

  // Auto-detect image dimensions when media changes
  useEffect(() => {
    if (!isOpen || !media || media.type === 'video') return;

    setImageLoading(true);
    setImageDimensions(null);

    // First try to use metadata if available
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
    } else {
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

      img.src = `/api/media/download/${media.id}`;
    }
  }, [media, isOpen]);

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

  // Calculate container styles to preserve aspect ratio
  const getImageContainerStyle = () => {
    if (!imageDimensions) return {};
    
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    
    // Use 90% of viewport with some padding
    const maxWidth = Math.min(viewportWidth * 0.9, 1400);
    const maxHeight = Math.min(viewportHeight * 0.85, 1000);
    
    // Calculate dimensions that fit within viewport while preserving aspect ratio
    let displayWidth = imageDimensions.width;
    let displayHeight = imageDimensions.height;
    
    // Scale down if too large
    if (displayWidth > maxWidth) {
      displayHeight = (displayHeight * maxWidth) / displayWidth;
      displayWidth = maxWidth;
    }
    
    if (displayHeight > maxHeight) {
      displayWidth = (displayWidth * maxHeight) / displayHeight;
      displayHeight = maxHeight;
    }
    
    return {
      width: displayWidth,
      height: displayHeight,
      aspectRatio: imageDimensions.aspectRatio
    };
  };

  const containerStyle = getImageContainerStyle();

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[2001]">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Navigation Buttons */}
      {currentIndex > 0 && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}

      {currentIndex < allMedia.length - 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Main Content */}
      <div className="flex items-center justify-center w-full h-full p-8">
        {isVideo ? (
          <video
            controls
            autoPlay
            className="max-w-full max-h-full object-contain"
            poster={`/api/media/download/${media.id}/thumbnail`}
          >
            <source src={`/api/media/download/${media.id}`} type={getVideoMimeType(media.originalFilename)} />
            <source src={`/api/media/download/${media.id}`} type="video/mp4" />
            <source src={`/api/media/download/${media.id}`} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div 
            className="relative flex items-center justify-center"
            style={containerStyle}
          >
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
            <Image
              src={`/api/media/download/${media.id}`}
              alt={media.originalFilename}
              width={imageDimensions?.width || 1600}
              height={imageDimensions?.height || 1200}
              className="object-contain w-full h-full"
              priority
              style={{
                aspectRatio: imageDimensions?.aspectRatio || 'auto'
              }}
              onLoad={() => setImageLoading(false)}
            />
          </div>
        )}
      </div>

      {/* Metadata Panel */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg">
        <div className="space-y-2 text-sm">
          <div className="font-semibold">{media.originalFilename}</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-300">Taken:</span> {format(new Date(media.takenAt), 'PPp')}
            </div>
            <div>
              <span className="text-gray-300">Size:</span> {Math.round((media.metadata?.size || 0) / 1024 / 1024 * 100) / 100} MB
            </div>
            {imageDimensions && (
              <div>
                <span className="text-gray-300">Dimensions:</span> {imageDimensions.width} × {imageDimensions.height}
              </div>
            )}
            {media.metadata?.camera && (
              <div>
                <span className="text-gray-300">Camera:</span> {media.metadata.camera}
              </div>
            )}
            {imageDimensions && (
              <div>
                <span className="text-gray-300">Aspect Ratio:</span> {imageDimensions.aspectRatio.toFixed(2)}:1
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Counter */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
        {currentIndex + 1} / {allMedia.length}
      </div>
    </div>
  );
} 