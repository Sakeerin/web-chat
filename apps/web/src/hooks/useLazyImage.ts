import { useState, useEffect, useRef, useCallback } from 'react'

interface UseLazyImageOptions {
  src: string
  placeholder?: string
  threshold?: number
  rootMargin?: string
  onLoad?: () => void
  onError?: () => void
}

interface UseLazyImageReturn {
  src: string
  isLoading: boolean
  isError: boolean
  ref: React.RefObject<HTMLImageElement>
}

export const useLazyImage = ({
  src,
  placeholder = '',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
}: UseLazyImageOptions): UseLazyImageReturn => {
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Intersection Observer to detect when image enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  // Load image when it becomes visible
  useEffect(() => {
    if (!isIntersecting || !src) return

    const img = new Image()
    
    const handleLoad = () => {
      setImageSrc(src)
      setIsLoading(false)
      setIsError(false)
      onLoad?.()
    }

    const handleError = () => {
      setIsLoading(false)
      setIsError(true)
      onError?.()
    }

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)
    
    img.src = src

    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [isIntersecting, src, onLoad, onError])

  return {
    src: imageSrc,
    isLoading,
    isError,
    ref: imgRef,
  }
}

// Hook for lazy loading multiple images in a list
export const useLazyImageList = (images: string[], options?: Omit<UseLazyImageOptions, 'src'>) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set())

  const handleLoad = useCallback((src: string) => {
    setLoadedImages(prev => new Set(prev).add(src))
    options?.onLoad?.()
  }, [options])

  const handleError = useCallback((src: string) => {
    setErrorImages(prev => new Set(prev).add(src))
    options?.onError?.()
  }, [options])

  const getImageProps = useCallback((src: string) => {
    return {
      ...options,
      src,
      onLoad: () => handleLoad(src),
      onError: () => handleError(src),
    }
  }, [options, handleLoad, handleError])

  return {
    getImageProps,
    isLoaded: (src: string) => loadedImages.has(src),
    isError: (src: string) => errorImages.has(src),
    loadedCount: loadedImages.size,
    errorCount: errorImages.size,
  }
}