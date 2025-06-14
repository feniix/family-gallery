import { MediaMetadata } from '@/types/media';
import { r2Config } from '@/lib/config';
import { SimpleLightbox } from './simple-lightbox';
import { SimpleLightboxSigned } from './simple-lightbox-signed';

interface SimpleLightboxProps {
  media: MediaMetadata;
  allMedia: MediaMetadata[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Wrapper component that switches between original and signed URL versions
 * based on the R2_USE_SIGNED_URLS environment variable
 */
export function SimpleLightboxWrapper(props: SimpleLightboxProps) {
  if (r2Config.useSignedUrls) {
    return <SimpleLightboxSigned {...props} />;
  }
  
  return <SimpleLightbox {...props} />;
} 