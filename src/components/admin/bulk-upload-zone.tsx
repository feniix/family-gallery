'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { toast } from 'sonner';
import { 
  Upload, 
  X, 
  FileIcon, 
  ImageIcon, 
  VideoIcon, 
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Tags,
  FolderOpen
} from 'lucide-react';
import type { UploadFile } from '@/types/upload';
import { extractExifMetadata } from '@/lib/exif';
import { generateVideoThumbnail } from '@/lib/video-processing';
import type { MediaMetadata } from '@/types/media';

interface BulkUploadZoneProps {
  availableTags: string[];
  onUploadComplete: (uploadedMedia: MediaMetadata[]) => void;
  onTagsUpdate: (tags: string[]) => void;
}

interface UploadState {
  files: ExtendedUploadFile[];
  isUploading: boolean;
  selectedTags: string[];
  newTag: string;
  showTagDialog: boolean;
  overallProgress: number;
}

// Extended UploadFile interface to include image thumbnail
interface ExtendedUploadFile extends UploadFile {
  // Image thumbnail
  imageThumbnail?: Blob | null;
}

/**
 * Generate thumbnail from image file
 */
async function generateImageThumbnail(
  imageFile: File,
  options: { width?: number; height?: number; quality?: number } = {}
): Promise<Blob | null> {
  const { width = 320, height = 240, quality = 0.8 } = options;

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(null);
      return;
    }

    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      let canvasWidth = width;
      let canvasHeight = height;

      if (aspectRatio > 1) {
        canvasHeight = canvasWidth / aspectRatio;
      } else {
        canvasWidth = canvasHeight * aspectRatio;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(null);
    };

    img.src = URL.createObjectURL(imageFile);
  });
}

export function BulkUploadZone({ availableTags, onUploadComplete, onTagsUpdate }: BulkUploadZoneProps) {
  const { userId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [state, setState] = useState<UploadState>({
    files: [],
    isUploading: false,
    selectedTags: [],
    newTag: '',
    showTagDialog: false,
    overallProgress: 0
  });

  const handleFileSelect = useCallback(async (selectedFiles: FileList | File[]) => {
    const files = Array.from(selectedFiles);
    
    // Validate file types and sizes
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const file of files) {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const maxSize = file.type.startsWith('video/') ? 500 * 1024 * 1024 : 50 * 1024 * 1024; // 500MB for video, 50MB for images
      
      if (!isValidType) {
        invalidFiles.push(`${file.name}: Invalid file type`);
        continue;
      }
      
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name}: File too large`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} files were rejected:\n${invalidFiles.slice(0, 3).join('\n')}${invalidFiles.length > 3 ? '\n...' : ''}`);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Create upload file objects
    const uploadFiles: ExtendedUploadFile[] = validFiles.map(file => ({
      id: self.crypto?.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36),
      file,
      status: 'pending',
      progress: 0
    }));

    setState(prev => ({
      ...prev,
      files: [...prev.files, ...uploadFiles]
    }));

    // Extract EXIF data for images and generate thumbnails for both images and videos
    for (const uploadFile of uploadFiles) {
      if (uploadFile.file.type.startsWith('image/')) {
        try {
          const exifData = await extractExifMetadata(uploadFile.file);
          console.log('Generating thumbnail for:', uploadFile.file.name);
          const imageThumbnail = await generateImageThumbnail(uploadFile.file, {
            width: 320,
            height: 240,
            quality: 0.8
          });
          console.log('Thumbnail generated:', {
            filename: uploadFile.file.name,
            thumbnailSize: imageThumbnail?.size || 0,
            thumbnailExists: !!imageThumbnail
          });
          setState(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.id === uploadFile.id ? { ...f, exifData, imageThumbnail } : f
            )
          }));
        } catch (error) {
          console.error('EXIF extraction or thumbnail generation failed:', error);
        }
      } else if (uploadFile.file.type.startsWith('video/')) {
        try {
          const thumbnailResult = await generateVideoThumbnail(uploadFile.file, {
            thumbnailWidth: 320,
            thumbnailHeight: 240,
            thumbnailQuality: 0.8
          });
          
          setState(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.id === uploadFile.id ? { 
                ...f, 
                videoThumbnail: thumbnailResult.thumbnail,
                videoMetadata: thumbnailResult.metadata
              } : f
            )
          }));
        } catch (error) {
          console.error('Video thumbnail generation failed:', error);
        }
      }
    }

    toast.success(`${validFiles.length} files added to upload queue`);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleRemoveFile = (fileId: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }));
  };

  const handleAddTag = () => {
    const tag = state.newTag.trim().toLowerCase();
    if (tag && !state.selectedTags.includes(tag)) {
      setState(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, tag],
        newTag: ''
      }));

      // If it's a new tag, add to available tags
      if (!availableTags.includes(tag)) {
        onTagsUpdate([...availableTags, tag]);
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setState(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.filter(t => t !== tag)
    }));
  };

  const handleTagToggle = (tag: string) => {
    setState(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  };

  const handleStartUpload = async () => {
    const pendingFiles = state.files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      toast.error('No files ready for upload');
      return;
    }

    setState(prev => ({ ...prev, isUploading: true, overallProgress: 0 }));
    toast.info(`Starting upload of ${pendingFiles.length} files`);

    const uploadedMedia: MediaMetadata[] = [];
    let completedCount = 0;

    for (const uploadFile of pendingFiles) {
      try {


        // Update file status
        setState(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
          )
        }));

        let result: MediaMetadata;

        if (uploadFile.file.type.startsWith('video/')) {

          // Use API endpoint for video uploads with transaction handling
          const formData = new FormData();
          formData.append('file', uploadFile.file);
          formData.append('userId', userId || 'unknown');
          formData.append('tags', JSON.stringify(state.selectedTags));
          
          // Add video metadata if available
          if (uploadFile.videoMetadata) {
            formData.append('videoMetadata', JSON.stringify(uploadFile.videoMetadata));
          }
          
          // Add thumbnail if generated
          if (uploadFile.videoThumbnail) {
            formData.append('thumbnail', uploadFile.videoThumbnail, 'thumbnail.jpg');
          }

          const videoUploadResponse = await fetch('/api/upload/video', {
            method: 'POST',
            body: formData
          });

          if (!videoUploadResponse.ok) {
            const errorData = await videoUploadResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Video upload failed');
          }

          result = await videoUploadResponse.json();
        } else {

          // Regular upload for images - use proper metadata processing
          const { processMediaMetadata } = await import('@/lib/metadata');
          const { metadata: processedMetadata, fileNaming, hash } = await processMediaMetadata(
            uploadFile.file, 
            userId || 'unknown', 
            'web', 
            uploadFile.exifData
          );


          // Get presigned URL using the properly processed takenAt date
          const presignedResponse = await fetch('/api/upload/presigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: uploadFile.file.name,
              contentType: uploadFile.file.type,
              fileSize: uploadFile.file.size,
              takenAt: processedMetadata.takenAt
            })
          });

          if (!presignedResponse.ok) {
            const errorData = await presignedResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Failed to get upload URL: ${errorData.error || presignedResponse.status}`);
          }

          const { presignedUrl, filePath } = await presignedResponse.json();

          // Upload to R2
          const uploadResponse = await fetch(presignedUrl, {
            method: 'PUT',
            body: uploadFile.file,
            headers: { 'Content-Type': uploadFile.file.type }
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text().catch(() => 'No error details');
            throw new Error(`Upload to R2 failed: ${uploadResponse.status} - ${errorText}`);
          }

          // Upload thumbnail if generated
          if (uploadFile.imageThumbnail && fileNaming.thumbnailPath) {
            try {
              console.log('Uploading thumbnail:', {
                thumbnailPath: fileNaming.thumbnailPath,
                thumbnailSize: uploadFile.imageThumbnail.size,
                originalFilename: uploadFile.file.name
              });
              
              const { generatePresignedUploadUrl } = await import('@/lib/r2');
              const thumbnailPresignedUrl = await generatePresignedUploadUrl(fileNaming.thumbnailPath, 'image/jpeg');
              
              const thumbnailUploadResponse = await fetch(thumbnailPresignedUrl, {
                method: 'PUT',
                body: uploadFile.imageThumbnail,
                headers: { 'Content-Type': 'image/jpeg' }
              });
              
              if (!thumbnailUploadResponse.ok) {
                console.warn('Thumbnail upload failed:', {
                  status: thumbnailUploadResponse.status,
                  statusText: thumbnailUploadResponse.statusText,
                  thumbnailPath: fileNaming.thumbnailPath
                });
              } else {
                console.log('Thumbnail uploaded successfully:', fileNaming.thumbnailPath);
              }
            } catch (thumbnailError) {
              console.warn('Thumbnail upload failed:', thumbnailError);
            }
          } else {
            console.log('No thumbnail to upload:', {
              hasThumbnail: !!uploadFile.imageThumbnail,
              thumbnailSize: uploadFile.imageThumbnail?.size,
              hasThumbnailPath: !!fileNaming.thumbnailPath,
              thumbnailPath: fileNaming.thumbnailPath,
              originalFilename: uploadFile.file.name
            });
          }

          // Update to processing
          setState(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.id === uploadFile.id ? { ...f, status: 'processing' } : f
            )
          }));

          // Generate a unique ID for the media
          const mediaId = self.crypto?.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
          
          // Create metadata using the properly processed metadata with selected tags
          const mediaMetadata: MediaMetadata = {
            ...processedMetadata,
            id: mediaId,
            path: filePath,
            thumbnailPath: fileNaming.thumbnailPath,
            tags: state.selectedTags,
            metadata: {
              ...processedMetadata.metadata,
              hash
            }
          };


          
          // Save to database
          const saveResponse = await fetch('/api/media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mediaMetadata)
          });

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Failed to save media metadata: ${errorData.error || saveResponse.status}`);
          }

          // API returns success message, use our original metadata
          await saveResponse.json();
          result = mediaMetadata; // Use the metadata we created since API doesn't return the object
        }

        // Add selected tags if not already included
        if (state.selectedTags.length > 0 && result.id) {
          const uniqueTags = [...new Set([...result.tags, ...state.selectedTags])];
          if (uniqueTags.length !== result.tags.length) {
            await fetch('/api/media/tags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update-media-tags',
                mediaId: result.id,
                tags: uniqueTags
              })
            });
            result.tags = uniqueTags;
          }
        }

        uploadedMedia.push(result);
        completedCount++;

        // Update file status to completed
        setState(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100 } : f
          ),
          overallProgress: Math.round((completedCount / pendingFiles.length) * 100)
        }));

      } catch (error) {
        console.error('Upload failed:', error);
        setState(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === uploadFile.id ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            } : f
          )
        }));
      }
    }

    setState(prev => ({ ...prev, isUploading: false }));
    
    if (uploadedMedia.length > 0) {
      toast.success(`Successfully uploaded ${uploadedMedia.length} files`);
      onUploadComplete(uploadedMedia);
    }

    if (completedCount < pendingFiles.length) {
      toast.error(`${pendingFiles.length - completedCount} files failed to upload`);
    }
  };

  const handleClearCompleted = () => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.status !== 'completed')
    }));
  };

  const handleRetryFailed = () => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.status === 'error' ? { ...f, status: 'pending', error: undefined } : f
      )
    }));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    } else if (file.type.startsWith('video/')) {
      return <VideoIcon className="h-4 w-4 text-purple-500" />;
    }
    return <FileIcon className="h-4 w-4 text-gray-500" />;
  };

  const getStatusIcon = (status: ExtendedUploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const stats = {
    total: state.files.length,
    pending: state.files.filter(f => f.status === 'pending').length,
    uploading: state.files.filter(f => f.status === 'uploading' || f.status === 'processing').length,
    completed: state.files.filter(f => f.status === 'completed').length,
    failed: state.files.filter(f => f.status === 'error').length
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Media
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-muted p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Drag and drop files here</h3>
                <p className="text-sm text-muted-foreground">
                  or click to browse files
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={state.isUploading}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Tagging */}
      {state.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Bulk Tagging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Selected Tags (will be applied to all uploads)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {state.selectedTags.map(tag => (
                  <Badge key={tag} variant="default" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
                {state.selectedTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags selected</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add new tag..."
                value={state.newTag}
                onChange={(e) => setState(prev => ({ ...prev, newTag: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1"
              />
              <Button onClick={handleAddTag} disabled={!state.newTag.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <Label>Available Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={state.selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Queue */}
      {state.files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload Queue ({stats.total} files)</CardTitle>
              <div className="flex gap-2">
                {stats.failed > 0 && (
                  <Button variant="outline" size="sm" onClick={handleRetryFailed}>
                    Retry Failed
                  </Button>
                )}
                {stats.completed > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearCompleted}>
                    Clear Completed
                  </Button>
                )}
                <Button 
                  onClick={handleStartUpload}
                  disabled={state.isUploading || stats.pending === 0}
                  size="sm"
                >
                  {state.isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {stats.pending} Files
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Overall Progress */}
            {state.isUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{state.overallProgress}%</span>
                </div>
                <Progress value={state.overallProgress} className="h-2" />
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mb-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.uploading}</div>
                <div className="text-xs text-muted-foreground">Uploading</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* File List */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {state.files.map(uploadFile => (
                <div key={uploadFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadFile.file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                      {getStatusIcon(uploadFile.status)}
                      <Badge variant="outline" className="text-xs">
                        {uploadFile.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    {uploadFile.error && (
                      <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(uploadFile.id)}
                    disabled={uploadFile.status === 'uploading' || uploadFile.status === 'processing'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 