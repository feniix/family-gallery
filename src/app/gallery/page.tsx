'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhotoGrid } from '@/components/gallery/photo-grid'
import { TimelineView } from '@/components/gallery/timeline-view'
import { Lightbox } from '@/components/gallery/lightbox'
import { SubjectFilter } from '@/components/gallery/subject-filter'
import { SearchBar } from '@/components/gallery/search-bar'
import { MediaMetadata } from '@/types/media'
import { LayoutGrid, Clock, Filter } from 'lucide-react'

export default function GalleryPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [selectedMedia, setSelectedMedia] = useState<MediaMetadata | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [allMedia, setAllMedia] = useState<MediaMetadata[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaMetadata[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<MediaMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/sign-in';
    }
  }, [isLoaded, isSignedIn]);

  // Load available subjects
  useEffect(() => {
    if (isSignedIn) {
      loadAvailableSubjects();
    }
  }, [isSignedIn]);

  // Filter media when subjects change
  useEffect(() => {
    if (selectedSubjects.length === 0) {
      setFilteredMedia(allMedia);
    } else {
      loadFilteredMedia();
    }
  }, [selectedSubjects, allMedia]); // loadFilteredMedia is stable

  const loadAvailableSubjects = async () => {
    try {
      const response = await fetch('/api/media/subjects?action=list');
      if (response.ok) {
        const data = await response.json();
        setAvailableSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadFilteredMedia = async () => {
    try {
      const response = await fetch(`/api/media/subjects?action=filter&filter=${selectedSubjects.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        setFilteredMedia(data.media || []);
      }
    } catch (error) {
      console.error('Error filtering media:', error);
      setFilteredMedia([]);
    }
  };

  const handlePhotoClick = (media: MediaMetadata, index: number) => {
    setSelectedMedia(media);
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const handleMediaUpdate = (media: MediaMetadata[]) => {
    setAllMedia(media);
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) {
        return prev.filter(s => s !== subject);
      } else {
        return [...prev, subject];
      }
    });
  };

  const handleClearFilters = () => {
    setSelectedSubjects([]);
  };

  const handleSearchResults = (results: MediaMetadata[]) => {
    setSearchResults(results);
    setIsSearching(results.length !== allMedia.length || results.length === 0);
  };

  // Determine what media to display based on filters and search
  const displayMedia = useMemo(() => {
    if (isSearching) {
      // If searching, apply subject filters to search results
      if (selectedSubjects.length > 0) {
        return searchResults.filter(media => 
          media.subjects?.some(subject => selectedSubjects.includes(subject))
        );
      }
      return searchResults;
    } else {
      // No search, just apply subject filters
      return selectedSubjects.length > 0 ? filteredMedia : allMedia;
    }
  }, [isSearching, searchResults, selectedSubjects, filteredMedia, allMedia]);

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedMedia(displayMedia[newIndex]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < displayMedia.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedMedia(displayMedia[newIndex]);
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
              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={selectedSubjects.length > 0 ? 'bg-primary text-primary-foreground' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {selectedSubjects.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {selectedSubjects.length}
                  </Badge>
                )}
              </Button>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </button>
              </div>
              <UserButton />
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            allMedia={allMedia}
            onSearchResults={handleSearchResults}
            className="max-w-md mx-auto"
          />
        </div>

        {/* Subject Filter */}
        {showFilters && availableSubjects.length > 0 && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <SubjectFilter
              availableSubjects={availableSubjects}
              selectedSubjects={selectedSubjects}
              onSubjectToggle={handleSubjectToggle}
              onClearFilters={handleClearFilters}
              mediaCount={displayMedia.length}
            />
          </div>
        )}

        {/* Gallery Views */}
        {viewMode === 'timeline' ? (
          <TimelineView onMediaUpdate={handleMediaUpdate} />
        ) : (
          <PhotoGrid 
            onPhotoClick={handlePhotoClick}
            onMediaUpdate={handleMediaUpdate}
          />
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        media={selectedMedia}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        onPrevious={selectedIndex > 0 ? handlePrevious : undefined}
        onNext={selectedIndex < displayMedia.length - 1 ? handleNext : undefined}
        showNavigation={displayMedia.length > 1}
      />
    </div>
  )
} 