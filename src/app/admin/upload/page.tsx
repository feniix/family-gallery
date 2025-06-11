'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useIsAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadZone } from '@/components/admin/upload-zone'
import { UploadProgress } from '@/components/admin/upload-progress'
import { Upload, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { extractExifMetadata } from '@/lib/exif'
import { getMaxPhotoSizeDisplay, getMaxVideoSizeDisplay } from '@/lib/config'
import { uploadWithTransaction } from '@/lib/upload-transaction'
import type { ExifMetadata, MediaMetadata } from '@/types/media'
import { uploadLogger } from '@/lib/logger'
import { clientUploadLogger, clientTestLogger } from '@/lib/client-logger'

export interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'duplicate-warning'
  progress: number
  error?: string
  presignedUrl?: string
  filePath?: string
  jobId?: string
  // Duplicate detection fields
  isDuplicate?: boolean
  duplicateInfo?: {
    existingFilename: string
    existingId: string
    existingDate: string
  }
  hash?: string
  // Client-side extracted EXIF data
  exifData?: ExifMetadata | null
  exifExtracted?: boolean
}

export default function AdminUploadPage() {
  const { isLoaded, user } = useUser()
  const isAdmin = useIsAdmin()
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [isMigratingIndex, setIsMigratingIndex] = useState(false)

  // Define all callbacks and functions before any conditional returns
  const extractEXIFForImages = useCallback(async (uploadFiles: UploadFile[]) => {
    const imageFiles = uploadFiles.filter(uf => uf.file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      uploadLogger.debug('No image files to process for EXIF extraction');
      return;
    }
    
    uploadLogger.info('Starting EXIF extraction', { imageCount: imageFiles.length });
    
    let successCount = 0;
    
    for (const uploadFile of imageFiles) {
      try {
        uploadLogger.debug('Processing file for EXIF', { 
          filename: uploadFile.file.name, 
          type: uploadFile.file.type, 
          size: uploadFile.file.size 
        });
        
        const exifData = await extractExifMetadata(uploadFile.file);
        
        uploadLogger.debug('EXIF extraction result', {
          filename: uploadFile.file.name,
          hasExifData: !!exifData,
          hasDateTime: !!(exifData?.dateTimeOriginal || exifData?.dateTime),
          hasGPS: !!(exifData?.gps?.latitude && exifData?.gps?.longitude),
          camera: exifData?.make && exifData?.model ? `${exifData.make} ${exifData.model}` : null
        });
        
        // Store EXIF data in the upload file
        setUploadFiles(prev => prev.map(uf => 
          uf.id === uploadFile.id 
            ? { ...uf, exifData }
            : uf
        ));
        
        if (exifData) {
          uploadLogger.info('EXIF data extracted successfully', {
            filename: uploadFile.file.name,
            hasDateTime: !!(exifData.dateTimeOriginal || exifData.dateTime),
            hasGPS: !!(exifData.gps?.latitude && exifData.gps?.longitude)
          });
          successCount++;
        } else {
          uploadLogger.debug('No EXIF data found', { filename: uploadFile.file.name });
        }
      } catch (error) {
        uploadLogger.error('Failed to extract EXIF data', { 
          filename: uploadFile.file.name, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    uploadLogger.info('EXIF extraction completed', { successCount, totalFiles: imageFiles.length });
  }, []);

  const checkDuplicatesForFiles = useCallback(async (uploadFiles: UploadFile[]) => {
    uploadLogger.debug('Starting duplicate check for files', { fileCount: uploadFiles.length });
    setIsCheckingDuplicates(true);
    let duplicatesFound = 0;

    try {
      for (const uploadFile of uploadFiles) {
        try {
          uploadLogger.debug('Checking for duplicates', { filename: uploadFile.file.name });
          
          const formData = new FormData();
          formData.append('file', uploadFile.file);
          
          if (uploadFile.exifData) {
            formData.append('exifData', JSON.stringify(uploadFile.exifData));
            uploadLogger.debug('Sending EXIF data for duplicate check', { filename: uploadFile.file.name });
          } else {
            uploadLogger.debug('No EXIF data available for duplicate check', { filename: uploadFile.file.name });
          }
          
          const response = await fetch('/api/upload/check-duplicate', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            uploadLogger.debug('Duplicate check result', { filename: uploadFile.file.name, isDuplicate: result.isDuplicate });
            
            setUploadFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { 
                    ...f, 
                    hash: result.hash,
                    isDuplicate: result.isDuplicate,
                    status: result.isDuplicate ? 'duplicate-warning' : 'pending',
                    duplicateInfo: result.existingMedia ? {
                      existingFilename: result.existingMedia.originalFilename,
                      existingId: result.existingMedia.id,
                      existingDate: result.existingMedia.takenAt
                    } : undefined
                  }
                : f
            ));

            if (result.isDuplicate) {
              duplicatesFound++;
              uploadLogger.warn('Duplicate file detected', { 
                filename: uploadFile.file.name,
                existingFile: result.existingMedia?.originalFilename 
              });
            } else {
              uploadLogger.debug('File is not a duplicate', { filename: uploadFile.file.name });
            }
          } else {
            uploadLogger.error('Failed to check duplicate', { filename: uploadFile.file.name, status: response.status });
          }
        } catch (error) {
          uploadLogger.error('Error checking duplicate', { 
            filename: uploadFile.file.name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      uploadLogger.info('Duplicate check completed', { duplicatesFound, totalFiles: uploadFiles.length });

      if (duplicatesFound > 0) {
        toast.warning(
          `${duplicatesFound} duplicate file(s) detected. Check the upload queue for details.`,
          {
            duration: 5000,
            action: {
              label: 'Review',
              onClick: () => {
                document.getElementById('upload-queue')?.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }
        );
      }
    } catch (error) {
      uploadLogger.error('Error during duplicate checking', { error: error instanceof Error ? error.message : 'Unknown error' });
      toast.error('Failed to check for duplicates, but upload can continue');
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    uploadLogger.debug('Files selected for upload', { count: files.length, filenames: files.map(f => f.name) });
    
    try {
      const newUploadFiles: UploadFile[] = files.map(file => ({
        file,
        id: crypto.randomUUID(),
        progress: 0,
        status: 'pending' as const,
        uploadedBy: user?.emailAddresses[0]?.emailAddress || 'unknown',
      }));
      
      setUploadFiles(prev => [...prev, ...newUploadFiles]);
      uploadLogger.debug('About to start EXIF extraction', { fileCount: newUploadFiles.length, filenames: newUploadFiles.map(f => f.file.name) });
      
      // Extract EXIF data for images before proceeding
      await extractEXIFForImages(newUploadFiles);
      
      uploadLogger.debug('EXIF extraction completed, now checking duplicates');
      
      // Check for duplicates
      await checkDuplicatesForFiles(newUploadFiles);
      
      uploadLogger.debug('Upload preparation completed');
    } catch (error) {
      uploadLogger.error('Error during file preparation', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, [user, extractEXIFForImages, checkDuplicatesForFiles]);

  // Redirect if not admin
  if (isLoaded && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardContent>
              You need administrator privileges to access this page.
            </CardContent>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }





  const handleStartUpload = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending' || f.status === 'duplicate-warning')
    if (pendingFiles.length === 0) {
      toast.error('No files ready for upload')
      return
    }

    // Check if there are any duplicate warnings
    const duplicateWarnings = pendingFiles.filter(f => f.status === 'duplicate-warning')
    if (duplicateWarnings.length > 0) {
      const proceed = window.confirm(
        `${duplicateWarnings.length} file(s) appear to be duplicates. Do you want to upload them anyway?\n\n` +
        `This will create multiple copies of the same photo/video in your gallery.`
      )
      
      if (!proceed) {
        toast.info('Upload cancelled. Remove duplicate files or proceed to upload anyway.')
        return
      }
    }

    setIsUploading(true)
    toast.info(`Starting upload of ${pendingFiles.length} file(s)`)

    // Process uploads
    for (const uploadFile of pendingFiles) {
      try {
        await processFileUpload(uploadFile)
      } catch (error) {
        clientUploadLogger.error('Upload failed', { fileName: uploadFile.file.name, error });
        updateFileStatus(uploadFile.id, 'error', 0, error instanceof Error ? error.message : 'Upload failed')
      }
    }

    setIsUploading(false)
    toast.success('Upload batch completed')
  }

  const processFileUpload = async (uploadFile: UploadFile) => {
    try {
      // Update status to uploading
      updateFileStatus(uploadFile.id, 'uploading', 0)

      // For video files, use the transaction-based upload system that handles thumbnail generation
      if (uploadFile.file.type.startsWith('video/')) {
        clientUploadLogger.info('Using transaction upload for video', { fileName: uploadFile.file.name });
        
        updateFileStatus(uploadFile.id, 'processing', 20)
        
        const mediaMetadata = await uploadWithTransaction(uploadFile.file, {
          userId: user?.id || 'unknown'
        })
        
        clientUploadLogger.info('Video upload with thumbnail completed', { 
          fileName: uploadFile.file.name,
          mediaId: mediaMetadata.id 
        });
        updateFileStatus(uploadFile.id, 'completed', 100)
        return
      }

      // For photos, continue with the existing upload flow
      // Determine the best date to use for file organization
      let takenAt: string | undefined;
      if (uploadFile.exifData?.dateTimeOriginal) {
        takenAt = uploadFile.exifData.dateTimeOriginal.toISOString();
      } else if (uploadFile.exifData?.dateTime) {
        takenAt = uploadFile.exifData.dateTime.toISOString();
      } else if (uploadFile.exifData?.dateTimeDigitized) {
        takenAt = uploadFile.exifData.dateTimeDigitized.toISOString();
      }
      
      clientUploadLogger.debug('Requesting presigned URL', { 
        fileName: uploadFile.file.name, 
        takenAt: takenAt || 'current date' 
      });

      // Get presigned URL
      const response = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.file.name,
          contentType: uploadFile.file.type,
          fileSize: uploadFile.file.size,
          takenAt
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || `Failed to get upload URL (${response.status})`)
      }

      const { presignedUrl, filePath, jobId } = await response.json()

      // Update with presigned URL info
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, presignedUrl, filePath, jobId }
          : f
      ))

      // Upload to R2 with progress tracking
      updateFileStatus(uploadFile.id, 'uploading', 10)

      try {
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: uploadFile.file,
          headers: {
            'Content-Type': uploadFile.file.type
          }
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => 'Unknown error')
          clientUploadLogger.error('R2 Upload failed', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
            fileName: uploadFile.file.name,
            contentType: uploadFile.file.type
          });
          
          // Provide more specific error messages
          if (uploadResponse.status === 403) {
            throw new Error('Upload forbidden - check R2 CORS configuration')
          } else if (uploadResponse.status === 0) {
            throw new Error('Network error - check internet connection and R2 CORS settings')
          } else {
            throw new Error(`Upload failed (${uploadResponse.status}): ${uploadResponse.statusText}`)
          }
        }
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to R2. Check CORS configuration.')
        }
        throw error
      }

      // Update status to processing
      updateFileStatus(uploadFile.id, 'processing', 70)

      // Process metadata and save to database
      clientUploadLogger.debug('Processing metadata', { fileName: uploadFile.file.name });
      
             // Create media metadata
       const mediaMetadata: MediaMetadata = {
        id: crypto.randomUUID(),
        filename: uploadFile.file.name.replace(/[^a-zA-Z0-9.-]/g, '_'), // Sanitize filename
        originalFilename: uploadFile.file.name,
        path: filePath,
        type: uploadFile.file.type.startsWith('video/') ? 'video' as const : 'photo' as const,
        uploadedBy: user?.id || 'unknown',
        uploadedAt: new Date().toISOString(),
        uploadSource: 'web' as const,
        takenAt: takenAt || new Date().toISOString(),
        dateInfo: {
          source: uploadFile.exifData?.dateTimeOriginal ? 'exif' as const : 'upload-time' as const,
          confidence: uploadFile.exifData?.dateTimeOriginal ? 'high' as const : 'low' as const,
        },
        metadata: {
          size: uploadFile.file.size,
          hash: uploadFile.hash || 'unknown',
          // Add EXIF data if available
          ...(uploadFile.exifData && { exif: uploadFile.exifData }),
          // Add GPS location if available in EXIF
          ...(uploadFile.exifData?.gps && {
            location: {
              lat: uploadFile.exifData.gps.latitude,
              lng: uploadFile.exifData.gps.longitude,
            },
          }),
          // Add camera info if available
          ...(uploadFile.exifData?.make && uploadFile.exifData?.model && {
            camera: `${uploadFile.exifData.make} ${uploadFile.exifData.model}`,
          }),
          // Add dimensions if available
          ...(uploadFile.exifData?.pixelXDimension && { width: uploadFile.exifData.pixelXDimension }),
          ...(uploadFile.exifData?.pixelYDimension && { height: uploadFile.exifData.pixelYDimension }),
        },
        subjects: [], // Will be populated by admin during upload
        tags: [], // Will be populated by admin during upload
        // File processing flags
        isScreenshot: uploadFile.file.name.toLowerCase().includes('screenshot'),
        isEdited: uploadFile.file.name.toLowerCase().includes('edited'),
        hasValidExif: !!uploadFile.exifData,
      }

      updateFileStatus(uploadFile.id, 'processing', 85)

      // Save metadata to database
      clientUploadLogger.debug('Saving metadata to database', { fileName: uploadFile.file.name });
      const saveResponse = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaMetadata)
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || `Failed to save metadata (${saveResponse.status})`)
      }

      const saveResult = await saveResponse.json()
      clientUploadLogger.info('Metadata saved successfully', { 
        fileName: uploadFile.file.name, 
        mediaId: saveResult.id 
      });

      // Mark as completed
      updateFileStatus(uploadFile.id, 'completed', 100)
      
    } catch (error) {
      clientUploadLogger.error('Upload process failed', { 
        fileName: uploadFile.file.name, 
        error 
      });
      throw error
    }
  }

  const updateFileStatus = (fileId: string, status: UploadFile['status'], progress: number, error?: string) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status, progress, error }
        : f
    ))
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleClearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'completed'))
    toast.success('Cleared completed uploads')
  }

  const handleRetryFailed = () => {
    setUploadFiles(prev => prev.map(f => 
      f.status === 'error' 
        ? { ...f, status: 'pending', progress: 0, error: undefined }
        : f
    ))
    toast.success('Reset failed uploads to pending')
  }

  const handleForceUploadDuplicate = (fileId: string) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'pending' }
        : f
    ))
    toast.success('File marked for upload (duplicate warning removed)')
  }

  const handleTestExifExtraction = async () => {
    clientTestLogger.info('Testing EXIF extraction capabilities');
    
    try {
      // Test if exifr is available
      const exifr = await import('exifr')
      clientTestLogger.debug('Library availability', { exifrLoaded: !!exifr.default });
      
      // Test if we're in browser environment
      clientTestLogger.debug('Browser environment', { 
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined' 
      });
      
      toast.success('EXIF library test completed - check console for details')
    } catch (error) {
      clientTestLogger.error('EXIF test failed', { error });
      toast.error('EXIF library test failed - check console for details')
    }
  }

  const handleMigrateIndex = async () => {
    setIsMigratingIndex(true)
    try {
      clientUploadLogger.info('Starting media index migration');
      toast.info('Starting media index migration...')
      
      const response = await fetch('/api/admin/migrate-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || `Migration failed (${response.status})`)
      }
      
      const result = await response.json()
      clientUploadLogger.info('Migration completed', { 
        totalMedia: result.totalMedia, 
        yearsFound: result.yearsFound.length 
      });
      toast.success(`Index migration completed! Found ${result.totalMedia} media items in ${result.yearsFound.length} years.`)
      
    } catch (error) {
      clientUploadLogger.error('Migration failed', { error });
      toast.error(error instanceof Error ? error.message : 'Migration failed')
    } finally {
      setIsMigratingIndex(false)
    }
  }

  const handleTestFileExif = async () => {
    // Create a file input for testing
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        toast.info(`Testing EXIF extraction on ${file.name}...`)
        clientTestLogger.debug('Testing EXIF extraction on file', {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified)
        });

        const exifData = await extractExifMetadata(file)
        clientTestLogger.debug('EXIF extraction result', { 
          fileName: file.name, 
          hasExifData: !!exifData,
          exifData 
        });

        if (exifData) {
          toast.success(`EXIF data found! Camera: ${exifData.make || 'Unknown'} ${exifData.model || ''}, Date: ${exifData.dateTimeOriginal ? new Date(exifData.dateTimeOriginal).toLocaleDateString() : 'No date'}`)
        } else {
          toast.warning(`No EXIF data found in ${file.name}. This might be normal for some image types or processed photos.`)
        }
      } catch (error) {
        clientTestLogger.error('EXIF extraction failed', { fileName: file.name, error });
        toast.error(`EXIF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    input.click()
  }

  // Calculate statistics
  const stats = {
    total: uploadFiles.length,
    pending: uploadFiles.filter(f => f.status === 'pending').length,
    uploading: uploadFiles.filter(f => f.status === 'uploading').length,
    processing: uploadFiles.filter(f => f.status === 'processing').length,
    completed: uploadFiles.filter(f => f.status === 'completed').length,
    failed: uploadFiles.filter(f => f.status === 'error').length,
    duplicates: uploadFiles.filter(f => f.status === 'duplicate-warning').length,
    images: uploadFiles.filter(f => f.file.type.startsWith('image/')).length,
    videos: uploadFiles.filter(f => f.file.type.startsWith('video/')).length
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Upload Media</h1>
            <p className="text-muted-foreground">
              Upload photos and videos to the family gallery. Duplicate detection is enabled to help prevent duplicate uploads.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleMigrateIndex}
              disabled={isMigratingIndex}
              variant="outline"
              size="sm"
            >
              {isMigratingIndex ? 'Migrating...' : 'Migrate Index'}
            </Button>
            <Button
              onClick={handleTestExifExtraction}
              variant="outline"
              size="sm"
            >
              Test EXIF Library
            </Button>
            <Button
              onClick={handleTestFileExif}
              variant="outline"
              size="sm"
            >
              Test File EXIF
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Statistics */}
      {uploadFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.uploading}</div>
                <div className="text-sm text-muted-foreground">Uploading</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.processing}</div>
                <div className="text-sm text-muted-foreground">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
            
            {/* Upload Action Button */}
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleStartUpload}
                disabled={isUploading || (stats.pending + stats.duplicates) === 0}
                size="lg"
                className="px-8"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload {stats.pending + stats.duplicates} Files
              </Button>
              {isCheckingDuplicates && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Checking for duplicates...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Detection Warning */}
      {stats.duplicates > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800 dark:text-orange-200">
                Duplicate Files Detected
              </CardTitle>
            </div>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              {stats.duplicates} file(s) appear to be duplicates of photos already in your gallery. 
              You can still upload them if needed, but this will create multiple copies.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Drag and drop photos and videos here, or click to select files. 
            Duplicate detection will automatically check your files.
            Supported formats: JPG, PNG, GIF, WebP, MP4, MOV, AVI (max {getMaxPhotoSizeDisplay()} for photos, {getMaxVideoSizeDisplay()} for videos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadZone 
            onFilesSelected={handleFilesSelected}
            disabled={isUploading || isCheckingDuplicates}
          />
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <Card id="upload-queue">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload Queue</CardTitle>
                <CardDescription>
                  Track upload progress and manage your files. Duplicates are highlighted in orange.
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                {stats.failed > 0 && (
                  <Button
                    onClick={handleRetryFailed}
                    variant="outline"
                    size="sm"
                  >
                    Retry Failed
                  </Button>
                )}
                {stats.completed > 0 && (
                  <Button
                    onClick={handleClearCompleted}
                    variant="outline"
                    size="sm"
                  >
                    Clear Completed
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <UploadProgress 
              files={uploadFiles}
              onRemoveFile={handleRemoveFile}
              onForceUploadDuplicate={handleForceUploadDuplicate}
            />
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      {isUploading && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {stats.completed} of {stats.total} files completed
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 