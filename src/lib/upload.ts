/**
 * Upload utilities for handling file uploads with progress tracking
 */

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  onError?: (error: Error) => void
  onSuccess?: () => void
  signal?: AbortSignal
}

/**
 * Upload a file to R2 using presigned URL with progress tracking
 */
export async function uploadFileToR2(
  file: File,
  presignedUrl: string,
  options: UploadOptions = {}
): Promise<void> {
  const { onProgress, onError, onSuccess, signal } = options

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Handle progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          }
          onProgress(progress)
        }
      })
    }

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onSuccess?.()
        resolve()
      } else {
        const error = new Error(`Upload failed with status ${xhr.status}`)
        onError?.(error)
        reject(error)
      }
    })

    // Handle error
    xhr.addEventListener('error', () => {
      const error = new Error('Upload failed due to network error')
      onError?.(error)
      reject(error)
    })

    // Handle abort
    xhr.addEventListener('abort', () => {
      const error = new Error('Upload was aborted')
      onError?.(error)
      reject(error)
    })

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort()
      })
    }

    // Start upload
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Get presigned URL for file upload
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  fileSize: number
): Promise<{
  presignedUrl: string
  filePath: string
  jobId: string
  expiresIn: number
}> {
  const response = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename,
      contentType,
      fileSize,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to get presigned URL')
  }

  return response.json()
}

// Use consolidated version that supports more specific validation
import { isValidFileType as validateFileType } from '@/lib/utils'

/**
 * Validate file type (simplified wrapper for backward compatibility)
 */
export function isValidFileType(filename: string): boolean {
  return validateFileType(filename, 'any')
}

/**
 * Validate file size
 */
export function isValidFileSize(fileSize: number, maxSize: number = 50 * 1024 * 1024): boolean {
  return fileSize <= maxSize
}

// Re-export utilities from consolidated location
import { formatFileSize, generateUniqueId, getFileExtension } from '@/lib/utils'
export { formatFileSize, generateUniqueId as generateFileId, getFileExtension }

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Check if file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

/**
 * Create upload queue item
 */
export interface UploadQueueItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  presignedUrl?: string
  filePath?: string
  jobId?: string
  abortController?: AbortController
}

/**
 * Create a new upload queue item
 */
export function createUploadQueueItem(file: File): UploadQueueItem {
  return {
    id: generateUniqueId(),
    file,
    status: 'pending',
    progress: 0,
    abortController: new AbortController()
  }
}

/**
 * Upload error types
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public code: string,
    public fileId?: string
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

export const UploadErrorCodes = {
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PRESIGNED_URL_FAILED: 'PRESIGNED_URL_FAILED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  ABORTED: 'ABORTED'
} as const 