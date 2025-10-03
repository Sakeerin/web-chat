import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent } from '@ui/components/card'
import { uploadApiService } from '@/services/uploadApi'

interface MediaPreviewProps {
  src: string
  type: 'image' | 'video' | 'audio'
  fileName?: string
  fileSize?: number
  width?: number
  height?: number
  duration?: number
  thumbnailSrc?: string
  className?: string
  onDownload?: () => void
  onFullscreen?: () => void
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  src,
  type,
  fileName,
  fileSize,
  width,
  height,
  duration,
  thumbnailSrc,
  className = '',
  onDownload,
  onFullscreen
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
  }, [])

  const handlePlayPause = useCallback(() => {
    if (type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    } else if (type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [type, isPlaying])

  const renderImagePreview = () => (
    <div className="relative group">
      <img
        src={thumbnailSrc || src}
        alt={fileName || 'Image'}
        className="w-full h-auto rounded-lg cursor-pointer"
        onLoad={handleLoad}
        onError={handleError}
        onClick={onFullscreen}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-xs text-gray-500">Failed to load</div>
          </div>
        </div>
      )}

      {/* Overlay controls */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex space-x-2">
          {onFullscreen && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onFullscreen}
              className="bg-white bg-opacity-90 hover:bg-opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>
          )}
          {onDownload && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onDownload}
              className="bg-white bg-opacity-90 hover:bg-opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  const renderVideoPreview = () => (
    <div className="relative">
      <video
        ref={videoRef}
        src={src}
        poster={thumbnailSrc}
        className="w-full h-auto rounded-lg"
        controls
        preload="metadata"
        onLoadedData={handleLoad}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-xs text-gray-500">Failed to load video</div>
          </div>
        </div>
      )}
    </div>
  )

  const renderAudioPreview = () => (
    <Card className="w-full max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          {/* Play/Pause button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            className="flex-shrink-0 w-10 h-10 rounded-full p-0"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1M9 6h1m4 0h1" />
              </svg>
            )}
          </Button>

          {/* Audio info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {fileName || 'Audio file'}
            </div>
            <div className="text-xs text-gray-500 flex items-center space-x-2">
              {duration && (
                <span>{uploadApiService.formatDuration(duration)}</span>
              )}
              {fileSize && (
                <span>{uploadApiService.formatFileSize(fileSize)}</span>
              )}
            </div>
          </div>

          {/* Download button */}
          {onDownload && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDownload}
              className="flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </Button>
          )}
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={src}
          onLoadedData={handleLoad}
          onError={handleError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </CardContent>
    </Card>
  )

  return (
    <div className={className}>
      {type === 'image' && renderImagePreview()}
      {type === 'video' && renderVideoPreview()}
      {type === 'audio' && renderAudioPreview()}
    </div>
  )
}

// File attachment preview for non-media files
export const FileAttachmentPreview: React.FC<{
  fileName: string
  fileSize: number
  mimeType: string
  downloadUrl: string
  className?: string
}> = ({
  fileName,
  fileSize,
  mimeType,
  downloadUrl,
  className = ''
}) => {
  const getFileIcon = () => {
    if (mimeType.includes('pdf')) {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
    
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }

    return (
      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className={`w-full max-w-sm cursor-pointer hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3" onClick={handleDownload}>
          {/* File icon */}
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </div>
            <div className="text-xs text-gray-500">
              {uploadApiService.formatFileSize(fileSize)}
            </div>
          </div>

          {/* Download icon */}
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}