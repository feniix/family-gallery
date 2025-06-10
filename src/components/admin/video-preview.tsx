'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Play, Video, Clock, FileVideo, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatVideoDuration, getVideoFileIcon } from '@/lib/video-processing';
import { formatFileSize } from '@/lib/upload';

interface VideoPreviewProps {
  file: File;
  thumbnail?: Blob | null;
  metadata?: {
    duration: number;
    width: number;
    height: number;
    size: number;
  };
  processingStatus?: 'pending' | 'processing' | 'completed' | 'error';
  processingError?: string;
  onRemove?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function VideoPreview({
  file,
  thumbnail,
  metadata,
  processingStatus = 'pending',
  processingError,
  onRemove,
  onRetry,
  className = '',
}: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Create video URL for preview
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  const handlePlayClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getStatusIcon = () => {
    switch (processingStatus) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (processingStatus) {
      case 'completed':
        return 'Ready';
      case 'error':
        return 'Error';
      case 'processing':
        return 'Processing...';
      default:
        return 'Pending';
    }
  };

  const thumbnailUrl = thumbnail ? URL.createObjectURL(thumbnail) : null;

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <CardContent className="p-4">
        {/* Video preview area */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
          {thumbnailUrl ? (
            <>
              <Image
                src={thumbnailUrl}
                alt="Video thumbnail"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePlayClick}
                  className="rounded-full w-12 h-12 p-0"
                >
                  <Play className="h-6 w-6" fill="currentColor" />
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Video className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">
                  {processingStatus === 'processing' ? 'Generating thumbnail...' : 'No thumbnail'}
                </p>
              </div>
            </div>
          )}
          
          {/* Status badge */}
          <div className="absolute top-2 right-2">
            <Badge 
              variant={processingStatus === 'error' ? 'destructive' : 'secondary'}
              className="flex items-center gap-1"
            >
              {getStatusIcon()}
              {getStatusText()}
            </Badge>
          </div>
        </div>

        {/* Video info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg">{getVideoFileIcon(file)}</span>
              <span className="text-sm font-medium truncate" title={file.name}>
                {file.name}
              </span>
            </div>
          </div>

          {/* Metadata */}
          {metadata && (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatVideoDuration(metadata.duration)}
              </div>
              <div className="flex items-center gap-1">
                <FileVideo className="h-3 w-3" />
                {metadata.width}×{metadata.height}
              </div>
              <div className="col-span-2">
                Size: {formatFileSize(metadata.size)}
              </div>
            </div>
          )}

          {/* File info fallback */}
          {!metadata && (
            <div className="text-xs text-gray-600">
              Size: {formatFileSize(file.size)}
            </div>
          )}

          {/* Error message */}
          {processingError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {processingError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {processingStatus === 'error' && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex-1"
              >
                Retry
              </Button>
            )}
            {onRemove && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemove}
                className={processingStatus === 'error' ? 'flex-1' : 'w-full'}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Hidden video element for playback */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          controls={false}
          muted
        />
      )}
    </Card>
  );
} 