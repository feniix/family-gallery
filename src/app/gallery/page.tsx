'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs'
import { UserButton } from '@clerk/nextjs'
import { PhotoGrid } from '@/components/gallery/photo-grid'
import { Lightbox } from '@/components/gallery/lightbox'
import { MediaMetadata } from '@/types/media'

export default function GalleryPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [selectedMedia, setSelectedMedia] = useState<MediaMetadata | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [allMedia, setAllMedia] = useState<MediaMetadata[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/sign-in';
    }
  }, [isLoaded, isSignedIn]);

  const handlePhotoClick = (media: MediaMetadata, index: number) => {
    setSelectedMedia(media);
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const handleMediaUpdate = (media: MediaMetadata[]) => {
    setAllMedia(media);
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedMedia(allMedia[newIndex]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < allMedia.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedMedia(allMedia[newIndex]);
    }
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setSelectedMedia(null);
  };

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not signed in (redirect will happen)
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Family Gallery</h1>
              <p className="text-sm text-muted-foreground">
                Your family memories
              </p>
            </div>
            <div className="flex items-center gap-4">
              <UserButton />
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Content */}
      <div className="container mx-auto px-4 py-8">
        <PhotoGrid 
          onPhotoClick={handlePhotoClick}
          onMediaUpdate={handleMediaUpdate}
        />
      </div>

      {/* Lightbox */}
      <Lightbox
        media={selectedMedia}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        onPrevious={selectedIndex > 0 ? handlePrevious : undefined}
        onNext={selectedIndex < allMedia.length - 1 ? handleNext : undefined}
        showNavigation={allMedia.length > 1}
      />
    </div>
  )
} 