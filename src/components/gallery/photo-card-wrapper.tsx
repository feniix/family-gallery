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
  // Debug logging to help troubleshoot (enabled in all environments temporarily)
  if (typeof window !== 'undefined') {
    console.log('PhotoCardWrapper debug:', {
      useSignedUrls: r2Config.useSignedUrls,
      NEXT_PUBLIC_R2_USE_SIGNED_URLS: process.env.NEXT_PUBLIC_R2_USE_SIGNED_URLS,
      R2_USE_SIGNED_URLS: process.env.R2_USE_SIGNED_URLS,
      isClient: typeof window !== 'undefined',
      nodeEnv: process.env.NODE_ENV
    });
  }

  if (r2Config.useSignedUrls) {
    console.log('Using PhotoCardSigned component');
    return <PhotoCardSigned {...props} />;
  }
  
  console.log('Using PhotoCard component');
  return <PhotoCard {...props} />;
} 