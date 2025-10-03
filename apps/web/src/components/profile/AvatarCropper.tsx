import React, { useState, useRef, useCallback } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@ui/components'

interface AvatarCropperProps {
  imageFile: File
  onCropComplete: (croppedFile: File) => void
  onCancel: () => void
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export const AvatarCropper: React.FC<AvatarCropperProps> = ({
  imageFile,
  onCropComplete,
  onCancel,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const url = URL.createObjectURL(imageFile)
    setImageUrl(url)
    
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return
    
    const img = imageRef.current
    const container = containerRef.current
    
    // Calculate display size while maintaining aspect ratio
    const containerWidth = container.clientWidth
    const containerHeight = 400 // Fixed height for cropper
    
    const aspectRatio = img.naturalWidth / img.naturalHeight
    let displayWidth = containerWidth
    let displayHeight = containerWidth / aspectRatio
    
    if (displayHeight > containerHeight) {
      displayHeight = containerHeight
      displayWidth = containerHeight * aspectRatio
    }
    
    setImageSize({ width: displayWidth, height: displayHeight })
    
    // Center the crop area
    const cropSize = Math.min(displayWidth, displayHeight) * 0.6
    setCropArea({
      x: (displayWidth - cropSize) / 2,
      y: (displayHeight - cropSize) / 2,
      width: cropSize,
      height: cropSize,
    })
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if click is inside crop area
    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true)
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - dragStart.x
    const y = e.clientY - rect.top - dragStart.y
    
    // Constrain to image bounds
    const maxX = imageSize.width - cropArea.width
    const maxY = imageSize.height - cropArea.height
    
    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleCropSizeChange = (newSize: number) => {
    const maxSize = Math.min(imageSize.width, imageSize.height)
    const size = Math.max(50, Math.min(newSize, maxSize))
    
    setCropArea(prev => {
      const maxX = imageSize.width - size
      const maxY = imageSize.height - size
      
      return {
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY)),
        width: size,
        height: size,
      }
    })
  }

  const cropImage = useCallback(async (): Promise<File> => {
    if (!imageRef.current || !canvasRef.current) {
      throw new Error('Image or canvas not ready')
    }
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context not available')
    
    const img = imageRef.current
    
    // Calculate scale factor between display size and actual image size
    const scaleX = img.naturalWidth / imageSize.width
    const scaleY = img.naturalHeight / imageSize.height
    
    // Set canvas size to desired output size (e.g., 200x200)
    const outputSize = 200
    canvas.width = outputSize
    canvas.height = outputSize
    
    // Calculate source rectangle in actual image coordinates
    const sourceX = cropArea.x * scaleX
    const sourceY = cropArea.y * scaleY
    const sourceWidth = cropArea.width * scaleX
    const sourceHeight = cropArea.height * scaleY
    
    // Draw the cropped image
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, outputSize, outputSize
    )
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'))
          return
        }
        
        // Create a new File object
        const file = new File([blob], `avatar_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        
        resolve(file)
      }, 'image/jpeg', 0.9)
    })
  }, [cropArea, imageSize])

  const handleCropConfirm = async () => {
    setIsProcessing(true)
    
    try {
      const croppedFile = await cropImage()
      onCropComplete(croppedFile)
    } catch (error) {
      console.error('Crop failed:', error)
      // Handle error - could show toast or alert
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Crop Profile Picture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cropper */}
        <div
          ref={containerRef}
          className="relative bg-gray-100 rounded-lg overflow-hidden cursor-move"
          style={{ height: '400px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageUrl && (
            <>
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: imageSize.width,
                  height: imageSize.height,
                }}
                onLoad={handleImageLoad}
                draggable={false}
              />
              
              {/* Crop overlay */}
              <div
                className="absolute border-2 border-white shadow-lg"
                style={{
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.width,
                  height: cropArea.height,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* Corner handles */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-gray-400 cursor-nw-resize" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-gray-400 cursor-ne-resize" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-gray-400 cursor-sw-resize" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-gray-400 cursor-se-resize" />
              </div>
            </>
          )}
        </div>

        {/* Size control */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Crop Size:</label>
          <input
            type="range"
            min="50"
            max={Math.min(imageSize.width, imageSize.height)}
            value={cropArea.width}
            onChange={(e) => handleCropSizeChange(parseInt(e.target.value))}
            className="flex-1"
            disabled={isProcessing}
          />
          <span className="text-sm text-gray-600 w-16">
            {Math.round(cropArea.width)}px
          </span>
        </div>

        {/* Preview */}
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium">Preview:</div>
          <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
            {imageUrl && (
              <div
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundPosition: `-${(cropArea.x / imageSize.width) * 100}% -${(cropArea.y / imageSize.height) * 100}%`,
                  backgroundSize: `${(imageSize.width / cropArea.width) * 100}% ${(imageSize.height / cropArea.height) * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCropConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Apply Crop'}
          </Button>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}