'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useIsAdmin } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UploadZone } from '@/components/admin/upload-zone'
import { UploadProgress } from '@/components/admin/upload-progress'
import { Upload, Image, Video, FileText, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
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
}

export default function AdminUploadPage() {
  const { isLoaded } = useUser()
  const isAdmin = useIsAdmin()
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)

  // Redirect if not admin
  if (isLoaded && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
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

  const handleFilesSelected = async (files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending',
      progress: 0
    }))

    setUploadFiles(prev => [...prev, ...newUploadFiles])
    toast.success(`${files.length} file(s) added to upload queue`)

    // Check for duplicates via API call
    await checkFilesForDuplicates(newUploadFiles)
  }

  const checkFilesForDuplicates = async (filesToCheck: UploadFile[]) => {
    setIsCheckingDuplicates(true)
    let duplicatesFound = 0

    try {
      for (const uploadFile of filesToCheck) {
        try {
          // Call API to check for duplicates instead of doing it client-side
          const formData = new FormData()
          formData.append('file', uploadFile.file)
          
          const response = await fetch('/api/upload/check-duplicate', {
            method: 'POST',
            body: formData
          })

          if (response.ok) {
            const result = await response.json()
            
            // Update file with duplicate info
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
            ))

            if (result.isDuplicate) {
              duplicatesFound++
            }
          } else {
            console.error(`Failed to check duplicate for ${uploadFile.file.name}`)
          }
        } catch (error) {
          console.error(`Error checking duplicate for ${uploadFile.file.name}:`, error)
          // Continue with other files - don't block upload for duplicate check failures
        }
      }

      if (duplicatesFound > 0) {
        toast.warning(
          `${duplicatesFound} duplicate file(s) detected. Check the upload queue for details.`,
          {
            duration: 5000,
            action: {
              label: 'Review',
              onClick: () => {
                // Scroll to upload queue
                document.getElementById('upload-queue')?.scrollIntoView({ behavior: 'smooth' })
              }
            }
          }
        )
      }
    } catch (error) {
      console.error('Error during duplicate checking:', error)
      toast.error('Failed to check for duplicates, but upload can continue')
    } finally {
      setIsCheckingDuplicates(false)
    }
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
        console.error('Upload failed:', error)
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

      // Get presigned URL
      const response = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.file.name,
          contentType: uploadFile.file.type,
          fileSize: uploadFile.file.size
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
          console.error('R2 Upload failed:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
            url: presignedUrl,
            file: uploadFile.file.name,
            contentType: uploadFile.file.type
          })
          
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
      updateFileStatus(uploadFile.id, 'processing', 90)

      // TODO: Process metadata (EXIF, thumbnails) - this will be implemented in Stage 2.2
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate processing

      // Mark as completed
      updateFileStatus(uploadFile.id, 'completed', 100)
      
    } catch (error) {
      console.error('Upload process failed:', error)
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
        <h1 className="text-3xl font-bold mb-2">Upload Media</h1>
        <p className="text-muted-foreground">
          Upload photos and videos to the family gallery. Duplicate detection is enabled to help prevent duplicate uploads.
        </p>
      </div>

      {/* Upload Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Images</p>
              <p className="text-2xl font-bold">{stats.images}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Video className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Videos</p>
              <p className="text-2xl font-bold">{stats.videos}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <Badge variant="secondary">{stats.pending} Pending</Badge>
            <Badge variant="outline">{stats.uploading} Uploading</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <Badge variant="outline">{stats.processing} Processing</Badge>
            <Badge variant="default">{stats.completed} Completed</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <Badge variant="destructive">{stats.failed} Failed</Badge>
        </Card>
        {stats.duplicates > 0 && (
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Duplicates</p>
                <p className="text-2xl font-bold text-orange-600">{stats.duplicates}</p>
              </div>
            </div>
          </Card>
        )}
        <Card className="p-4">
          <div className="space-y-2">
            <Button 
              onClick={handleStartUpload}
              disabled={isUploading || (stats.pending + stats.duplicates) === 0}
              size="sm"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload ({stats.pending + stats.duplicates})
            </Button>
            {isCheckingDuplicates && (
              <p className="text-xs text-muted-foreground text-center">
                Checking for duplicates...
              </p>
            )}
          </div>
        </Card>
      </div>

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

      {/* Upload Zone */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Drag and drop photos and videos here, or click to select files. 
            Duplicate detection will automatically check your files.
            Supported formats: JPG, PNG, GIF, WebP, MP4, MOV, AVI (max 50MB each)
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
    </div>
  )
} 