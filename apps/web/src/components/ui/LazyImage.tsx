import React from 'react'
import { useLazyImage } from '../../hooks/useLazyImage'
import { cn } from '../../lib/utils'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  placeholder?: string
  threshold?: number
  rootMargin?: string
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
  onImageLoad?: () => void
  onImageError?: () => void
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+',
  threshold = 0.1,
  rootMargin = '50px',
  fallback,
  loadingComponent,
  onImageLoad,
  onImageError,
  className,
  alt = '',
  ...props
}) => {
  const { src: imageSrc, isLoading, isError, ref } = useLazyImage({
    src,
    placeholder,
    threshold,
    rootMargin,
    onLoad: onImageLoad,
    onError: onImageError,
  })

  if (isError && fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="relative">
      <img
        ref={ref}
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading && 'opacity-50',
          className
        )}
        {...props}
      />
      
      {isLoading && loadingComponent && (
        <div className="absolute inset-0 flex items-center justify-center">
          {loadingComponent}
        </div>
      )}
    </div>
  )
}

// Avatar component with lazy loading
export const LazyAvatar: React.FC<{
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}> = ({ src, alt, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }

  const fallback = (
    <div className={cn(
      'flex items-center justify-center bg-gray-200 text-gray-600 rounded-full',
      sizeClasses[size],
      className
    )}>
      {alt.charAt(0).toUpperCase()}
    </div>
  )

  if (!src) {
    return fallback
  }

  return (
    <LazyImage
      src={src}
      alt={alt}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
      fallback={fallback}
      loadingComponent={
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      }
    />
  )
}

// Media thumbnail with lazy loading
export const LazyThumbnail: React.FC<{
  src: string
  alt: string
  aspectRatio?: 'square' | 'video' | 'auto'
  className?: string
  onClick?: () => void
}> = ({ src, alt, aspectRatio = 'auto', className, onClick }) => {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity',
        aspectClasses[aspectRatio],
        className
      )}
      onClick={onClick}
    >
      <LazyImage
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loadingComponent={
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        }
        fallback={
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
            Failed to load
          </div>
        }
      />
    </div>
  )
}