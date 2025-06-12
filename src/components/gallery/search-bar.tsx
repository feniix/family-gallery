'use client';

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { MediaMetadata } from '@/types/media';

interface SearchBarProps {
  allMedia: MediaMetadata[];
  onSearchResults: (results: MediaMetadata[]) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ 
  allMedia, 
  onSearchResults, 
  placeholder = "Search photos by tags, filename, camera...",
  className 
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounced search functionality
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() === '') {
        onSearchResults(allMedia);
        return;
      }

      const query = searchQuery.toLowerCase().trim();
      const filtered = allMedia.filter(media => {
        // Search in tags  
        const tagsMatch1 = media.tags?.some(tag => 
          tag.toLowerCase().includes(query)
        );
        
        // Search in filename
        const filenameMatch = media.originalFilename.toLowerCase().includes(query);
        
        // Search in camera info
        const cameraMatch = media.metadata?.camera?.toLowerCase().includes(query);
        
        // Search in tags
        const tagsMatch = media.tags?.some(tag => 
          tag.toLowerCase().includes(query)
        );

        // Search in EXIF metadata
        const exifMatch = media.metadata?.exif && (
          media.metadata.exif.make?.toLowerCase().includes(query) ||
          media.metadata.exif.model?.toLowerCase().includes(query) ||
          media.metadata.exif.software?.toLowerCase().includes(query)
        );

        return tagsMatch1 || filenameMatch || cameraMatch || tagsMatch || exifMatch;
      });

      onSearchResults(filtered);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allMedia, onSearchResults]);

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Search hints */}
      {searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-popover border rounded-lg shadow-md text-xs text-muted-foreground z-10">
          <div>Search includes: filenames, camera info, and tags</div>
        </div>
      )}
    </div>
  );
} 