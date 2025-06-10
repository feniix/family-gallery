'use client'

import { UploadFile } from '@/app/admin/upload/page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileImage, 
  FileVideo, 
  Clock,
  Upload
} from 'lucide-react'

interface UploadProgressProps {
  files: UploadFile[]
  onRemoveFile: (fileId: string) => void
}

export function UploadProgress({ files, onRemoveFile }: UploadProgressProps) {
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get status badge variant
  const getStatusBadge = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'uploading':
        return <Badge variant="outline"><Upload className="h-3 w-3 mr-1" />Uploading</Badge>
      case 'processing':
        return <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileImage className="h-4 w-4 text-green-500" />
    } else if (file.type.startsWith('video/')) {
      return <FileVideo className="h-4 w-4 text-purple-500" />
    }
    return <FileImage className="h-4 w-4 text-gray-500" />
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No files in upload queue</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {files.map((uploadFile) => (
        <Card key={uploadFile.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* File Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(uploadFile.file)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-sm font-medium truncate">
                    {uploadFile.file.name}
                  </p>
                  {getStatusBadge(uploadFile.status)}
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>{formatFileSize(uploadFile.file.size)}</span>
                  <span>{uploadFile.file.type}</span>
                  {uploadFile.filePath && (
                    <span className="truncate max-w-xs">
                      Path: {uploadFile.filePath}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {uploadFile.status === 'uploading' || uploadFile.status === 'processing' ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{uploadFile.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Error Message */}
                {uploadFile.status === 'error' && uploadFile.error && (
                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span className="font-medium">Error:</span>
                    </div>
                    <p className="mt-1">{uploadFile.error}</p>
                  </div>
                )}

                {/* Job ID for tracking */}
                {uploadFile.jobId && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Job ID: {uploadFile.jobId}
                  </div>
                )}
              </div>
            </div>

            {/* Remove Button */}
            <div className="flex-shrink-0 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(uploadFile.id)}
                disabled={uploadFile.status === 'uploading' || uploadFile.status === 'processing'}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 