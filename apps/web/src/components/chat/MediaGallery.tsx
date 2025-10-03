import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { MediaPreview, FileAttachmentPreview } from './MediaPreview'

interface MediaItem {
  id: string
  type: 'image' | 'video' | 'audio' | 'document'
  src: string
  thumbnailSrc?: string
  fileName: string
  fileSize: number
  mimeType: string
  width?: number
  height?: number
  duration?: number
  createdAt: Date
  messageId: string
}

interface MediaGalleryProps {
  conversationId: string
  isOpen: boolean
  onClose: () => void
  className?: string
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  conversationId,
  isOpen,
  onClose,
  className = ''
}) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)

  // Mock data - in real implementation, this would fetch from API
  const mockMediaItems: MediaItem[] = [
    {
      id: '1',
      type: 'image',
      src: 'https://picsum.photos/800/600?random=1',
      thumbnailSrc: 'https://picsum.photos/200/150?random=1',
      fileName: 'vacation-photo.jpg',
      fileSize: 2048576,
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      createdAt: new Date('2024-01-15'),
      messageId: 'msg1'
    },
    {
      id: '2',
      type: 'video',
      src: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      thumbnailSrc: 'https://picsum.photos/200/150?random=2',
      fileName: 'funny-video.mp4',
      fileSize: 10485760,
      mimeType: 'video/mp4',
      width: 1280,
      height: 720,
      duration: 30000,
      createdAt: new Date('2024-01-14'),
      messageId: 'msg2'
    },
    {
      id: '3',
      type: 'document',
      src: 'https://example.com/document.pdf',
      fileName: 'project-proposal.pdf',
      fileSize: 5242880,
      mimeType: 'application/pdf',
      createdAt: new Date('2024-01-13'),
      messageId: 'msg3'
    }
  ]

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      // Simulate API call
      setTimeout(() => {
        setMediaItems(mockMediaItems)
        setIsLoading(false)
      }, 500)
    }
  }, [isOpen, conversationId])

  const filteredItems = mediaItems.filter(item => 
    selectedType === 'all' || item.type === selectedType
  )

  const handleItemClick = useCallback((item: MediaItem) => {
    setSelectedItem(item)
  }, [])

  const handleDownload = useCallback((item: MediaItem) => {
    const link = document.createElement('a')
    link.href = item.src
    link.download = item.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const getTypeCount = (type: 'all' | 'image' | 'video' | 'audio' | 'document') => {
    if (type === 'all') return mediaItems.length
    return mediaItems.filter(item => item.type === type).length
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      
      {/* Gallery Modal */}
      <div className={`fixed inset-4 bg-white rounded-lg shadow-xl z-50 flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Media Gallery</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 p-4 border-b bg-gray-50">
          {[
            { key: 'all', label: 'All' },
            { key: 'image', label: 'Images' },
            { key: 'video', label: 'Videos' },
            { key: 'audio', label: 'Audio' },
            { key: 'document', label: 'Documents' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={selectedType === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType(key as any)}
              className="text-xs"
            >
              {label} ({getTypeCount(key as any)})
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-lg font-medium mb-2">No media found</div>
                <div className="text-sm">No {selectedType === 'all' ? 'media files' : selectedType + ' files'} in this conversation</div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredItems.map(item => (
                  <div key={item.id} className="group">
                    {item.type === 'image' ? (
                      <div
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleItemClick(item)}
                      >
                        <img
                          src={item.thumbnailSrc || item.src}
                          alt={item.fileName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    ) : item.type === 'video' ? (
                      <div
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative"
                        onClick={() => handleItemClick(item)}
                      >
                        <img
                          src={item.thumbnailSrc}
                          alt={item.fileName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black bg-opacity-50 rounded-full p-2">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1M9 6h1m4 0h1" />
                            </svg>
                          </div>
                        </div>
                        {item.duration && (
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                            {Math.floor(item.duration / 60000)}:{((item.duration % 60000) / 1000).toFixed(0).padStart(2, '0')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Card
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleItemClick(item)}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center text-center">
                            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="text-xs font-medium truncate w-full">
                              {item.fileName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(item.fileSize / 1024 / 1024).toFixed(1)}MB
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-size viewer */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-90 z-60" onClick={() => setSelectedItem(null)} />
          <div className="fixed inset-4 z-60 flex items-center justify-center">
            <div className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <div className="font-medium">{selectedItem.fileName}</div>
                  <div className="text-sm text-gray-500">
                    {(selectedItem.fileSize / 1024 / 1024).toFixed(1)}MB • {selectedItem.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selectedItem)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedItem(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {selectedItem.type === 'document' ? (
                  <FileAttachmentPreview
                    fileName={selectedItem.fileName}
                    fileSize={selectedItem.fileSize}
                    mimeType={selectedItem.mimeType}
                    downloadUrl={selectedItem.src}
                  />
                ) : (
                  <MediaPreview
                    src={selectedItem.src}
                    type={selectedItem.type}
                    fileName={selectedItem.fileName}
                    fileSize={selectedItem.fileSize}
                    width={selectedItem.width}
                    height={selectedItem.height}
                    duration={selectedItem.duration}
                    thumbnailSrc={selectedItem.thumbnailSrc}
                    onDownload={() => handleDownload(selectedItem)}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Compact media gallery trigger button
export const MediaGalleryButton: React.FC<{
  conversationId: string
  mediaCount?: number
  className?: string
}> = ({
  conversationId,
  mediaCount = 0,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`text-xs ${className}`}
        disabled={mediaCount === 0}
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Media ({mediaCount})
      </Button>

      <MediaGallery
        conversationId={conversationId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}