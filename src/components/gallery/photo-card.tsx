'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, Camera, MapPin, Play } from 'lucide-react';
import { MediaMetadata } from '@/types/media';
import { format } from 'date-fns';
import { getPublicUrl } from '@/lib/r2';

interface PhotoCardProps {
  media: MediaMetadata;
  onClick: () => void;
  priority?: boolean;
}

export function PhotoCard({ media, onClick, priority = false }: PhotoCardProps) {
  const imageUrl = getPublicUrl(media.thumbnailPath || media.path);
  const isVideo = media.type === 'video';
  const hasVideoThumbnail = isVideo && media.thumbnailPath;

  return (
    <div 
      className="group relative overflow-hidden rounded-lg bg-muted cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
      onClick={onClick}
    >
      {/* Image/Video Container */}
      <div className="relative aspect-square">
        {hasVideoThumbnail || !isVideo ? (
          <Image
            src={imageUrl}
            alt={media.originalFilename}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-110"
            priority={priority}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          // Placeholder for videos without thumbnails
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Play className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm font-medium">Video</p>
              <p className="text-xs">Thumbnail not available</p>
            </div>
          </div>
        )}
        
        {/* Video Indicator */}
        {isVideo && hasVideoThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="rounded-full bg-white/90 p-3 shadow-lg">
              <Play className="h-6 w-6 text-black fill-black" />
            </div>
          </div>
        )}

        {/* Overlay with Metadata */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <div className="space-y-1">
              {/* Date */}
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(media.takenAt), 'MMM d, yyyy')}</span>
              </div>
              
              {/* Camera */}
              {media.metadata.camera && (
                <div className="flex items-center gap-1 text-xs">
                  <Camera className="h-3 w-3" />
                  <span className="truncate">{media.metadata.camera}</span>
                </div>
              )}
              
              {/* Location */}
              {media.metadata.location && (
                <div className="flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  <span>Location available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top-right badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {media.isScreenshot && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              Screenshot
            </Badge>
          )}
          {media.isEdited && (
            <Badge variant="outline" className="text-xs px-1 py-0 bg-white/90">
              Edited
            </Badge>
          )}
        </div>

        {/* Tags (bottom-left) */}
        {media.tags.length > 0 && (
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-1">
              <div className="flex gap-1">
                {media.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1 py-0 bg-white/90 text-black">
                    {tag}
                  </Badge>
                ))}
                {media.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 bg-white/90 text-black">
                    +{media.tags.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 