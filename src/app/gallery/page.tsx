'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { UserButton } from '@clerk/nextjs';
import { 
  LayoutGrid, 
  Clock, 
  Settings, 
  Zap, 
  ZapOff
} from 'lucide-react';
import { TimelineView } from '@/components/gallery/timeline-view';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { VirtualPhotoGrid } from '@/components/gallery/virtual-photo-grid';
import { SearchBar } from '@/components/gallery/search-bar';
import { Lightbox } from '@/components/gallery/lightbox';
import { MediaMetadata } from '@/types/media';
import { isLowPerformanceDevice } from '@/lib/performance';

export default function GalleryPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  
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
  
  const [allMedia, setAllMedia] = useState<MediaMetadata[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaMetadata | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline');
  const [searchResults, setSearchResults] = useState<MediaMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  const handlePhotoClick = (media: MediaMetadata, index: number) => {
    setSelectedMedia(media);
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const handleMediaUpdate = (media: MediaMetadata[]) => {
    setAllMedia(media);
  };

  const handleSearchResults = (results: MediaMetadata[]) => {
    setSearchResults(results);
    setIsSearching(results.length !== allMedia.length || results.length === 0);
  };

  // Determine what media to display based on search
  const displayMedia = useMemo(() => {
    return isSearching ? searchResults : allMedia;
  }, [isSearching, searchResults, allMedia]);

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
  );
} 