'use client';

import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, Calendar, Camera, MapPin, Download } from 'lucide-react';
import { MediaMetadata } from '@/types/media';
import { format } from 'date-fns';
import { getPublicUrl } from '@/lib/r2';
import { getVideoMimeType } from '@/lib/video-processing';

interface LightboxProps {
  media: MediaMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  showNavigation?: boolean;
}

export function Lightbox({ 
  media, 
  isOpen, 
  onClose, 
  onPrevious, 
  onNext, 
  showNavigation = true 
}: LightboxProps) {
  if (!media) return null;

  const imageUrl = getPublicUrl(media.path);
  const isVideo = media.type === 'video';

  const handleDownload = () => {
    // Create a temporary link and click it to download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = media.originalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
        <div className="relative w-full h-full">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation Buttons */}
          {showNavigation && onPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white"
              onClick={onPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {showNavigation && onNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white"
              onClick={onNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Image/Video Content */}
          <div className="flex items-center justify-center w-full h-[80vh]">
            {isVideo ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  controls
                  className="max-w-full max-h-full object-contain"
                  preload="metadata"
                  poster={media.thumbnailPath ? getPublicUrl(media.thumbnailPath) : undefined}
                >
                  <source src={imageUrl} type={getVideoMimeType(media.originalFilename)} />
                  {/* Fallback sources for better compatibility */}
                  <source src={imageUrl} type="video/mp4" />
                  <source src={imageUrl} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={imageUrl}
                  alt={media.originalFilename}
                  fill
                  className="object-contain"
                  priority
                  sizes="95vw"
                />
              </div>
            )}
          </div>

          {/* Metadata Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent text-white p-6">
            <div className="space-y-4">
              {/* File Name */}
              <div>
                <h3 className="text-lg font-semibold truncate">{media.originalFilename}</h3>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                {/* Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(media.takenAt), 'PPP')}</span>
                </div>

                {/* Camera */}
                {media.metadata.camera && (
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span className="truncate">{media.metadata.camera}</span>
                  </div>
                )}

                {/* Location */}
                {media.metadata.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>GPS coordinates available</span>
                  </div>
                )}

                {/* File Size */}
                <div className="flex items-center gap-2">
                  <span>{(media.metadata.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {media.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="border-white/30 text-white">
                    {tag}
                  </Badge>
                ))}
                {media.isScreenshot && (
                  <Badge variant="destructive">Screenshot</Badge>
                )}
                {media.isEdited && (
                  <Badge variant="outline" className="border-white/30 text-white">Edited</Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 