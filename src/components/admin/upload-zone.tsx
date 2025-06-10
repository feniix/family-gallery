'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileImage, FileVideo, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  maxFiles?: number
  maxSize?: number // in bytes
}

export function UploadZone({ 
  onFilesSelected, 
  disabled = false, 
  maxFiles = 50,
  maxSize = 50 * 1024 * 1024 // 50MB default
}: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)

  // Validate file type
  const isValidFileType = (file: File): boolean => {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/avi', 'video/mov']
    
    return validImageTypes.includes(file.type) || validVideoTypes.includes(file.type)
  }

  // Validate file size
  const isValidFileSize = (file: File): boolean => {
    return file.size <= maxSize
  }

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            toast.error(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}.`)
          } else if (error.code === 'file-invalid-type') {
            toast.error(`File "${file.name}" is not a supported format.`)
          } else if (error.code === 'too-many-files') {
            toast.error(`Too many files. Maximum is ${maxFiles} files at once.`)
          } else {
            toast.error(`File "${file.name}" was rejected: ${error.message}`)
          }
        })
      })
    }

    // Validate accepted files
    const validFiles = acceptedFiles.filter(file => {
      if (!isValidFileType(file)) {
        toast.error(`File "${file.name}" is not a supported format.`)
        return false
      }
      if (!isValidFileSize(file)) {
        toast.error(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}.`)
        return false
      }
      return true
    })

    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
    }
  }, [onFilesSelected, maxFiles, maxSize])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    disabled,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.quicktime']
    },
    maxFiles,
    maxSize,
    multiple: true,
    noClick: true, // We'll handle click manually
    noKeyboard: true
  })

  return (
    <div className="w-full">
      <Card 
        {...getRootProps()}
        className={`
          border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragActive || dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="p-12 text-center">
          <div className="mx-auto mb-4">
            {isDragActive || dragActive ? (
              <Upload className="h-12 w-12 text-primary mx-auto animate-bounce" />
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <FileImage className="h-8 w-8 text-muted-foreground" />
                <FileVideo className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold mb-2">
            {isDragActive || dragActive 
              ? 'Drop files here!' 
              : 'Drag and drop your photos and videos'
            }
          </h3>

          <p className="text-sm text-muted-foreground mb-4">
            Or click to select files from your device
          </p>

          <Button 
            type="button"
            variant="outline"
            onClick={open}
            disabled={disabled}
            className="mb-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Files
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Supported formats:</strong> JPEG, PNG, GIF, WebP, MP4, MOV, AVI
            </p>
            <p>
              <strong>Maximum size:</strong> {formatFileSize(maxSize)} per file
            </p>
            <p>
              <strong>Maximum files:</strong> {maxFiles} files at once
            </p>
          </div>
        </div>
      </Card>

      {disabled && (
        <div className="mt-4 p-4 bg-muted rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Upload is currently in progress. Please wait for the current batch to complete.
          </p>
        </div>
      )}
    </div>
  )
} 