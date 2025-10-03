import React from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent } from '@ui/components/card'
import { uploadApiService } from '@/services/uploadApi'
import type { FileUploadState } from '@/hooks/useFileUpload'

interface UploadProgressProps {
  upload: FileUploadState
  onCancel?: (uploadId: string) => void
  onRetry?: (uploadId: string) => void
  onRemove?: (uploadId: string) => void
  className?: string
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  upload,
  onCancel,
  onRetry,
  onRemove,
  className = ''
}) => {
  const { file, progress, status, error, id } = upload

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      case 'uploading':
      case 'processing':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Preparing...'
      case 'uploading':
        return `Uploading... ${progress.percentage}%`
      case 'processing':
        return 'Processing...'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const getFileIcon = () => {
    const fileType = uploadApiService.getFileTypeFromMime(file.type)
    
    switch (fileType) {
      case 'image':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'video':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      case 'audio':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          {/* File icon */}
          <div className={`flex-shrink-0 ${getStatusColor()}`}>
            {getFileIcon()}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </div>
            <div className="text-xs text-gray-500">
              {uploadApiService.formatFileSize(file.size)}
            </div>
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            <div className={`text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex space-x-1">
            {status === 'error' && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRetry(id)}
                className="h-6 w-6 p-0"
                title="Retry upload"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            )}

            {(status === 'uploading' || status === 'processing') && onCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancel(id)}
                className="h-6 w-6 p-0"
                title="Cancel upload"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}

            {(status === 'completed' || status === 'error') && onRemove && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(id)}
                className="h-6 w-6 p-0"
                title="Remove"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  status === 'processing' ? 'bg-blue-500' : 'bg-green-500'
                }`}
                style={{
                  width: status === 'processing' ? '100%' : `${progress.percentage}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {status === 'error' && error && (
          <div className="mt-2 text-xs text-red-600">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// List component for multiple uploads
export const UploadProgressList: React.FC<{
  uploads: FileUploadState[]
  onCancel?: (uploadId: string) => void
  onRetry?: (uploadId: string) => void
  onRemove?: (uploadId: string) => void
  onClearCompleted?: () => void
  className?: string
}> = ({
  uploads,
  onCancel,
  onRetry,
  onRemove,
  onClearCompleted,
  className = ''
}) => {
  const hasCompleted = uploads.some(upload => upload.status === 'completed')

  if (uploads.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          Uploads ({uploads.length})
        </div>
        {hasCompleted && onClearCompleted && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearCompleted}
            className="text-xs"
          >
            Clear completed
          </Button>
        )}
      </div>

      {/* Upload items */}
      <div className="space-y-2">
        {uploads.map(upload => (
          <UploadProgress
            key={upload.id}
            upload={upload}
            onCancel={onCancel}
            onRetry={onRetry}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}