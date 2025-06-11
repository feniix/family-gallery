'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhotoGrid } from '@/components/gallery/photo-grid'
import { VirtualPhotoGrid } from '@/components/gallery/virtual-photo-grid'
import { TimelineView } from '@/components/gallery/timeline-view'
import { Lightbox } from '@/components/gallery/lightbox'
import { SubjectFilter } from '@/components/gallery/subject-filter'
import { SearchBar } from '@/components/gallery/search-bar'
import { MediaMetadata } from '@/types/media'
import { LayoutGrid, Clock, Filter, Zap, ZapOff, Settings } from 'lucide-react'
import { isLowPerformanceDevice } from '@/lib/performance'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  
  // Performance settings
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'performance' | 'quality'>('auto');
  const [virtualScrollEnabled, setVirtualScrollEnabled] = useState(false);

  // Auto-detect performance mode
  useEffect(() => {
    if (performanceMode === 'auto') {
      setVirtualScrollEnabled(isLowPerformanceDevice());
    } else {
      setVirtualScrollEnabled(performanceMode === 'performance');
    }
  }, [performanceMode]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/sign-in';
    }
  }, [isLoaded, isSignedIn]);

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

  const loadFilteredMedia = useCallback(async () => {
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
  }, [selectedSubjects]);

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
  }, [selectedSubjects, allMedia, loadFilteredMedia]);

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

  const getPerformanceIcon = () => {
    switch (performanceMode) {
      case 'performance':
        return <Zap className="h-4 w-4" />;
      case 'quality':
        return <ZapOff className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getPerformanceLabel = () => {
    switch (performanceMode) {
      case 'performance':
        return 'Performance Mode';
      case 'quality':
        return 'Quality Mode';
      default:
        return `Auto Mode ${virtualScrollEnabled ? '(Performance)' : '(Quality)'}`;
    }
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
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Family Gallery</h1>
          
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 border rounded-lg p-1">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="h-8 px-3"
              >
                <Clock className="h-4 w-4 mr-1" />
                Timeline
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-3"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Grid
              </Button>
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {selectedSubjects.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {selectedSubjects.length}
                </Badge>
              )}
            </Button>

            {/* Performance Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {getPerformanceIcon()}
                  <span className="ml-2 hidden sm:inline">{getPerformanceLabel()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Performance Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPerformanceMode('auto')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Auto Mode
                  {performanceMode === 'auto' && <Badge className="ml-auto">Active</Badge>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPerformanceMode('performance')}>
                  <Zap className="h-4 w-4 mr-2" />
                  Performance Mode
                  {performanceMode === 'performance' && <Badge className="ml-auto">Active</Badge>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPerformanceMode('quality')}>
                  <ZapOff className="h-4 w-4 mr-2" />
                  Quality Mode
                  {performanceMode === 'quality' && <Badge className="ml-auto">Active</Badge>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {virtualScrollEnabled ? 'Virtual scrolling enabled' : 'Standard scrolling'}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

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
          <TimelineView 
            onMediaUpdate={handleMediaUpdate}
            enablePerformanceOptimizations={performanceMode !== 'quality'}
          />
        ) : virtualScrollEnabled ? (
          <VirtualPhotoGrid 
            onPhotoClick={handlePhotoClick}
            onMediaUpdate={handleMediaUpdate}
            enableVirtualScrolling={true}
          />
        ) : (
          <PhotoGrid 
            onPhotoClick={handlePhotoClick}
            onMediaUpdate={handleMediaUpdate}
            enablePerformanceOptimizations={performanceMode !== 'quality'}
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