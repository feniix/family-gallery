import { MediaMetadata } from '@/types/media';
import { r2Config } from '@/lib/config';
import { PhotoCard } from './photo-card';
import { PhotoCardSigned } from './photo-card-signed';

interface PhotoCardProps {
  media: MediaMetadata;
  onClick: () => void;
  priority?: boolean;
  aspectRatio?: 'natural' | 'square' | '4/3' | '3/2' | '16/9';
}

/**
 * Wrapper component that switches between original and signed URL versions
 * based on the R2_USE_SIGNED_URLS environment variable
 */
export function PhotoCardWrapper(props: PhotoCardProps) {
  if (r2Config.useSignedUrls) {
    return <PhotoCardSigned {...props} />;
  }
  
  return <PhotoCard {...props} />;
} 