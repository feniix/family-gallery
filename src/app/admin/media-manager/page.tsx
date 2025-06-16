'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Trash2, 
  Calendar, 
  Tags, 
  Plus, 
  X,
  Loader2,
  CheckSquare,
  Square,
  Eye,
  Play
} from 'lucide-react';
import { PhotoCard } from '@/components/gallery/photo-card';
import { BulkUploadZone } from '@/components/admin/bulk-upload-zone';
import { SimpleLightbox } from '@/components/gallery/simple-lightbox';
import type { MediaMetadata } from '@/types/media';
import { apiLogger } from '@/lib/logger';
import { authenticatedFetch } from '@/lib/api-client';

interface MediaManagerState {
  media: MediaMetadata[];
  availableTags: string[];
  loading: boolean;
  selectedMedia: MediaMetadata | null;
  searchQuery: string;
  tagFilter: string[];
  selectedItems: Set<string>;
  bulkMode: boolean;
  lightboxOpen: boolean;
  lightboxIndex: number;
  sortBy: 'date-newest' | 'date-oldest' | 'name-asc' | 'size-desc';
}

export default function MediaManagerPage() {
  const { userId, isLoaded } = useAuth();
  const [state, setState] = useState<MediaManagerState>({
    media: [],
    availableTags: [],
    loading: true,
    selectedMedia: null,
    searchQuery: '',
    tagFilter: [],
    selectedItems: new Set(),
    bulkMode: false,
    lightboxOpen: false,
    lightboxIndex: 0,
    sortBy: 'date-newest'
  });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    media: MediaMetadata | null;
    field: 'date' | 'tags' | null;
  }>({
    open: false,
    media: null,
    field: null
  });

  const [bulkDialog, setBulkDialog] = useState<{
    open: boolean;
    action: 'delete' | 'add-tags' | 'remove-tags' | 'set-tags' | null;
  }>({
    open: false,
    action: null
  });

  const [newTag, setNewTag] = useState('');
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [deleteTagDialog, setDeleteTagDialog] = useState<{
    open: boolean;
    tag: string | null;
  }>({
    open: false,
    tag: null
  });

  useEffect(() => {
    if (isLoaded && userId) {
      loadMediaAndTags();
    }
  }, [isLoaded, userId]);

  const loadMediaAndTags = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const [mediaResponse, tagsResponse] = await Promise.all([
        authenticatedFetch('/api/media/all?limit=500'),
        authenticatedFetch('/api/media/tags?action=list')
      ]);

      if (mediaResponse.ok && tagsResponse.ok) {
        const mediaData = await mediaResponse.json();
        const tagsData = await tagsResponse.json();

        setState(prev => ({
          ...prev,
          media: mediaData.media || [],
          availableTags: tagsData.tags || [],
          loading: false
        }));
      } else {
        throw new Error('Failed to load data');
      }
    } catch (error) {
      apiLogger.error('Error loading data', { 
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error('Failed to load media and tags');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteMedia = async (mediaId: string, year: number) => {
    try {
      const response = await authenticatedFetch(`/api/media?id=${mediaId}&year=${year}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Media deleted successfully');
        setState(prev => ({
          ...prev,
          media: prev.media.filter(m => m.id !== mediaId)
        }));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete media');
      }
    } catch (error) {
      apiLogger.error('Error deleting media', { 
        mediaId: mediaId,
        year: year,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error('Failed to delete media');
    }
  };

  const handleBulkOperation = async (action: 'delete' | 'add-tags' | 'remove-tags' | 'set-tags', tags?: string[]) => {
    const selectedIds = Array.from(state.selectedItems);
    
    if (selectedIds.length === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      const body: {
        action: string;
        mediaIds: string[];
        tags?: string[];
      } = {
        action,
        mediaIds: selectedIds
      };

      if (tags) {
        body.tags = tags;
      }

      const response = await authenticatedFetch('/api/media/bulk', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();
        
        switch (action) {
          case 'delete':
            toast.success(`${result.deletedCount} items deleted successfully`);
            setState(prev => ({
              ...prev,
              media: prev.media.filter(m => !selectedIds.includes(m.id)),
              selectedItems: new Set()
            }));
            break;
          
          case 'add-tags':
          case 'remove-tags':
          case 'set-tags':
            toast.success(`Tags updated for ${result.updatedCount} items`);
            // Reload data to get updated tags
            await loadMediaAndTags();
            setState(prev => ({ ...prev, selectedItems: new Set() }));
            break;
        }
        
        setBulkDialog({ open: false, action: null });
        setBulkTags([]);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Bulk operation failed');
      }
    } catch (error) {
      apiLogger.error('Error in bulk operation', { 
        operation: action,
        selectedCount: selectedIds.length,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error(`Failed to ${action} media`);
    }
  };

  const handleEditDate = async (mediaId: string, newDate: string) => {
    try {
      const response = await authenticatedFetch('/api/media/edit', {
        method: 'PUT',
        body: JSON.stringify({
          mediaId,
          updates: { takenAt: newDate }
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Date updated successfully');
        
        setState(prev => ({
          ...prev,
          media: prev.media.map(m => 
            m.id === mediaId ? result.updatedMedia : m
          )
        }));
        
        setEditDialog({ open: false, media: null, field: null });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update date');
      }
    } catch (error) {
      apiLogger.error('Error updating date', { 
        mediaId: mediaId,
        newDate: newDate,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error('Failed to update date');
    }
  };

  const handleEditTags = async (mediaId: string, tags: string[]) => {
    try {
      const response = await authenticatedFetch('/api/media/tags', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update-media-tags',
          mediaId,
          tags
        })
      });

      if (response.ok) {
        toast.success('Tags updated successfully');
        
        setState(prev => ({
          ...prev,
          media: prev.media.map(m => 
            m.id === mediaId ? { ...m, tags } : m
          )
        }));
        
        setEditDialog({ open: false, media: null, field: null });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update tags');
      }
    } catch (error) {
      apiLogger.error('Error updating tags', { 
        mediaId: mediaId,
        tags: tags,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error('Failed to update tags');
    }
  };

  const handleCreateTag = async () => {
    if (!newTag.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }

    try {
      const response = await authenticatedFetch('/api/media/tags', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create-tag',
          newTag: newTag.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Tag created successfully');
        
        setState(prev => ({
          ...prev,
          availableTags: result.allTags
        }));
        
        setNewTag('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create tag');
      }
    } catch (error) {
      apiLogger.error('Error creating tag', { 
        tag: newTag,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error('Failed to create tag');
    }
  };

  const handleDeleteTag = async (tag: string) => {
    try {
      const response = await authenticatedFetch(`/api/media/tags?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Tag &quot;${tag}&quot; deleted and removed from ${result.mediaUpdated} media items`);
        
        setState(prev => ({
          ...prev,
          availableTags: result.remainingTags,
          media: prev.media.map(m => ({
            ...m,
            tags: m.tags.filter(t => t !== tag)
          }))
        }));
        
        setDeleteTagDialog({ open: false, tag: null });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete tag');
      }
    } catch (error) {
      apiLogger.error('Error deleting tag', { 
        tag: tag,
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error('Failed to delete tag');
    }
  };

  const toggleItemSelection = (mediaId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedItems);
      if (newSelected.has(mediaId)) {
        newSelected.delete(mediaId);
      } else {
        newSelected.add(mediaId);
      }
      return { ...prev, selectedItems: newSelected };
    });
  };

  const selectAllItems = () => {
    setState(prev => ({
      ...prev,
      selectedItems: new Set(filteredMedia.map(m => m.id))
    }));
  };

  const clearSelection = () => {
    setState(prev => ({ ...prev, selectedItems: new Set() }));
  };

  const filteredMedia = state.media
    .filter(media => {
      const matchesSearch = state.searchQuery === '' || 
        media.originalFilename.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        media.tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()));
      
      const matchesTags = state.tagFilter.length === 0 ||
        state.tagFilter.every(filterTag => media.tags.includes(filterTag));
      
      return matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      switch (state.sortBy) {
        case 'date-newest':
          return new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime();
        case 'date-oldest':
          return new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime();
        case 'name-asc':
          return a.originalFilename.localeCompare(b.originalFilename);
        case 'size-desc':
          return (b.metadata?.size || 0) - (a.metadata?.size || 0);
        default:
          return 0;
      }
    });

  const handleSortChange = (sortBy: MediaManagerState['sortBy']) => {
    setState(prev => ({ ...prev, sortBy }));
  };

  const handleOpenLightbox = (media: MediaMetadata) => {
    const index = filteredMedia.findIndex(m => m.id === media.id);
    setState(prev => ({
      ...prev,
      lightboxOpen: true,
      lightboxIndex: index,
      selectedMedia: media
    }));
  };

  const handleCloseLightbox = () => {
    setState(prev => ({
      ...prev,
      lightboxOpen: false,
      selectedMedia: null
    }));
  };

  const handleLightboxNext = () => {
    const nextIndex = (state.lightboxIndex + 1) % filteredMedia.length;
    setState(prev => ({
      ...prev,
      lightboxIndex: nextIndex,
      selectedMedia: filteredMedia[nextIndex]
    }));
  };

  const handleLightboxPrevious = () => {
    const prevIndex = state.lightboxIndex === 0 ? filteredMedia.length - 1 : state.lightboxIndex - 1;
    setState(prev => ({
      ...prev,
      lightboxIndex: prevIndex,
      selectedMedia: filteredMedia[prevIndex]
    }));
  };

  if (!isLoaded) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Media Manager</h1>
        <div className="flex gap-2">
          <Button 
            variant={state.bulkMode ? "default" : "outline"} 
            onClick={() => setState(prev => ({ 
              ...prev, 
              bulkMode: !prev.bulkMode,
              selectedItems: new Set()
            }))}
          >
            {state.bulkMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            Bulk Mode
          </Button>
          <Button onClick={loadMediaAndTags} disabled={state.loading}>
            {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList>
          <TabsTrigger value="manage">Manage Media</TabsTrigger>
          <TabsTrigger value="upload">Upload Media</TabsTrigger>
          <TabsTrigger value="tags">Tag Management</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <BulkUploadZone
            availableTags={state.availableTags}
            onUploadComplete={(uploadedMedia) => {
              setState(prev => ({
                ...prev,
                media: [...uploadedMedia, ...prev.media]
              }));
              toast.success(`${uploadedMedia.length} files uploaded successfully`);
            }}
            onTagsUpdate={(newTags) => {
              setState(prev => ({
                ...prev,
                availableTags: newTags
              }));
            }}
          />
        </TabsContent>

        <TabsContent value="tags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Tag Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Create new tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                />
                <Button onClick={handleCreateTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {state.availableTags.map(tag => (
                  <div key={tag} className="flex items-center gap-1">
                    <Badge variant="secondary">{tag}</Badge>
                    <AlertDialog
                      open={deleteTagDialog.open && deleteTagDialog.tag === tag}
                      onOpenChange={(open) => setDeleteTagDialog({ open, tag: open ? tag : null })}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the tag &quot;{tag}&quot;? This will remove it from all media items that have this tag. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTag(tag)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Tag
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
                {state.availableTags.length === 0 && (
                  <p className="text-muted-foreground">No tags yet. Create your first tag above.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {/* Bulk Actions */}
          {state.bulkMode && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {state.selectedItems.size} of {filteredMedia.length} items selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllItems}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  
                  {state.selectedItems.size > 0 && (
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button>
                            <Tags className="h-4 w-4 mr-2" />
                            Tag Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setBulkDialog({ open: true, action: 'add-tags' })}>
                            Add Tags
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setBulkDialog({ open: true, action: 'remove-tags' })}>
                            Remove Tags
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setBulkDialog({ open: true, action: 'set-tags' })}>
                            Set Tags
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Media</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {state.selectedItems.size} selected media items? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleBulkOperation('delete')}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Filter Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Label htmlFor="search">Search Media</Label>
                  <Input
                    id="search"
                    placeholder="Search by filename or tags..."
                    value={state.searchQuery}
                    onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <Label>Filter by Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {state.availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={state.tagFilter.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setState(prev => ({
                            ...prev,
                            tagFilter: prev.tagFilter.includes(tag)
                              ? prev.tagFilter.filter(t => t !== tag)
                              : [...prev.tagFilter, tag]
                          }));
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media Statistics */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{filteredMedia.length}</div>
                  <div className="text-xs text-muted-foreground">Total Items</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredMedia.filter(m => m.type === 'photo').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Photos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {filteredMedia.filter(m => m.type === 'video').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Videos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(filteredMedia.reduce((acc, m) => acc + (m.metadata?.size || 0), 0) / 1024 / 1024 / 1024 * 100) / 100}
                  </div>
                  <div className="text-xs text-muted-foreground">GB Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media Grid */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Media Items ({filteredMedia.length})</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sort: {
                      state.sortBy === 'date-newest' ? 'Date (Newest)' :
                      state.sortBy === 'date-oldest' ? 'Date (Oldest)' :
                      state.sortBy === 'name-asc' ? 'Name (A-Z)' :
                      'Size (Largest)'
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortChange('date-newest')}>
                    Date (Newest First)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('date-oldest')}>
                    Date (Oldest First)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('name-asc')}>
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('size-desc')}>
                    Size (Largest First)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              {state.loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center text-muted-foreground p-8">
                  No media found matching your criteria
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMedia.map(media => (
                    <Card key={media.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                      <div className="aspect-square bg-muted relative overflow-hidden cursor-pointer" onClick={() => handleOpenLightbox(media)}>
                        {state.bulkMode && (
                          <div 
                            className="absolute top-2 left-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              className="bg-white/80 rounded"
                              checked={state.selectedItems.has(media.id)}
                              onCheckedChange={() => toggleItemSelection(media.id)}
                            />
                          </div>
                        )}
                        
                        {/* Media Thumbnail with signed URL support */}
                        <PhotoCard
                          media={media}
                          onClick={() => handleOpenLightbox(media)}
                          aspectRatio="square"
                        />
                        
                        {/* Overlay for video */}
                        {media.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="rounded-full bg-white/90 p-3 shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="h-6 w-6 text-black fill-black" />
                            </div>
                          </div>
                        )}
                        
                        {/* Preview button */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLightbox(media);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <div className="space-y-1">
                          <h3 className="font-medium truncate text-sm">{media.originalFilename}</h3>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{new Date(media.takenAt).toLocaleDateString()}</span>
                            <span>{Math.round((media.metadata?.size || 0) / 1024 / 1024 * 100) / 100} MB</span>
                          </div>
                          {media.metadata?.width && media.metadata?.height && (
                            <p className="text-xs text-muted-foreground">
                              {media.metadata.width} × {media.metadata.height}
                              {media.type === 'video' && media.metadata.duration && (
                                <span> • {Math.round(media.metadata.duration)}s</span>
                              )}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {media.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {media.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{media.tags.length - 3} more
                            </Badge>
                          )}
                        </div>

                        {!state.bulkMode && (
                          <div className="flex gap-2 pt-2">
                            <Dialog
                              open={editDialog.open && editDialog.media?.id === media.id && editDialog.field === 'date'}
                              onOpenChange={(open) => setEditDialog({ 
                                open, 
                                media: open ? media : null, 
                                field: open ? 'date' : null 
                              })}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Date</DialogTitle>
                                  <DialogDescription>
                                    Change the taken date for {media.originalFilename}
                                  </DialogDescription>
                                </DialogHeader>
                                <EditDateForm
                                  currentDate={media.takenAt}
                                  onSave={(newDate) => handleEditDate(media.id, newDate)}
                                  onCancel={() => setEditDialog({ open: false, media: null, field: null })}
                                />
                              </DialogContent>
                            </Dialog>

                            <Dialog
                              open={editDialog.open && editDialog.media?.id === media.id && editDialog.field === 'tags'}
                              onOpenChange={(open) => setEditDialog({ 
                                open, 
                                media: open ? media : null, 
                                field: open ? 'tags' : null 
                              })}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Tags className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Tags</DialogTitle>
                                  <DialogDescription>
                                    Manage tags for {media.originalFilename}
                                  </DialogDescription>
                                </DialogHeader>
                                <EditTagsForm
                                  currentTags={media.tags}
                                  availableTags={state.availableTags}
                                  onSave={(newTags) => handleEditTags(media.id, newTags)}
                                  onCancel={() => setEditDialog({ open: false, media: null, field: null })}
                                />
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Media</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{media.originalFilename}&quot;? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteMedia(media.id, new Date(media.takenAt).getFullYear())}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Tag Operations Dialog */}
      <Dialog open={bulkDialog.open} onOpenChange={(open) => setBulkDialog({ open, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkDialog.action === 'add-tags' && 'Add Tags to Selected Items'}
              {bulkDialog.action === 'remove-tags' && 'Remove Tags from Selected Items'}
              {bulkDialog.action === 'set-tags' && 'Set Tags for Selected Items'}
            </DialogTitle>
            <DialogDescription>
              This will affect {state.selectedItems.size} selected media items.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Label>Select Tags</Label>
            <div className="flex flex-wrap gap-2">
              {state.availableTags.map(tag => (
                <Badge
                  key={tag}
                  variant={bulkTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setBulkTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            
            {bulkTags.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected tags:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {bulkTags.map(tag => (
                    <Badge key={tag} variant="default">
                      {tag}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => setBulkTags(prev => prev.filter(t => t !== tag))}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog({ open: false, action: null })}>
              Cancel
            </Button>
            <Button 
              onClick={() => bulkDialog.action && handleBulkOperation(bulkDialog.action, bulkTags)}
              disabled={bulkTags.length === 0}
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Lightbox */}
      {state.selectedMedia && (
        <SimpleLightbox
          media={state.selectedMedia}
          allMedia={filteredMedia}
          currentIndex={state.lightboxIndex}
          isOpen={state.lightboxOpen}
          onClose={handleCloseLightbox}
          onNext={handleLightboxNext}
          onPrevious={handleLightboxPrevious}
        />
      )}
    </div>
  );
}

function EditDateForm({ 
  currentDate, 
  onSave, 
  onCancel 
}: { 
  currentDate: string; 
  onSave: (date: string) => void; 
  onCancel: () => void; 
}) {
  const [date, setDate] = useState(currentDate.split('T')[0]);
  const [time, setTime] = useState(currentDate.split('T')[1]?.split('.')[0] || '12:00:00');

  const handleSave = () => {
    const newDateTime = `${date}T${time}`;
    onSave(newDateTime);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="time">Time</Label>
        <Input
          id="time"
          type="time"
          step="1"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function EditTagsForm({ 
  currentTags, 
  availableTags, 
  onSave, 
  onCancel 
}: { 
  currentTags: string[]; 
  availableTags: string[]; 
  onSave: (tags: string[]) => void; 
  onCancel: () => void; 
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Available Tags</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {availableTags.map(tag => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <Label>Selected Tags ({selectedTags.length})</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.map(tag => (
            <Badge key={tag} variant="default">
              {tag}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => toggleTag(tag)}
              />
            </Badge>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(selectedTags)}>Save</Button>
      </DialogFooter>
    </div>
  );
} 