import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

interface VirtualScrollOptions {
  itemHeight: number | ((index: number) => number)
  containerHeight: number
  itemCount: number
  overscan?: number
  scrollingDelay?: number
  getScrollElement?: () => HTMLElement | null
}

interface VirtualScrollReturn {
  virtualItems: Array<{
    index: number
    start: number
    size: number
    end: number
  }>
  totalSize: number
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void
  scrollToOffset: (offset: number) => void
  isScrolling: boolean
}

export const useVirtualScroll = ({
  itemHeight,
  containerHeight,
  itemCount,
  overscan = 5,
  scrollingDelay = 150,
  getScrollElement,
}: VirtualScrollOptions): VirtualScrollReturn => {
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>()

  // Calculate item sizes and positions
  const itemSizeCache = useMemo(() => {
    const cache = new Map<number, number>()
    let totalSize = 0
    
    for (let i = 0; i < itemCount; i++) {
      const size = typeof itemHeight === 'function' ? itemHeight(i) : itemHeight
      cache.set(i, size)
      totalSize += size
    }
    
    return { cache, totalSize }
  }, [itemHeight, itemCount])

  const getItemOffset = useCallback((index: number) => {
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += itemSizeCache.cache.get(i) || 0
    }
    return offset
  }, [itemSizeCache.cache])

  const getItemSize = useCallback((index: number) => {
    return itemSizeCache.cache.get(index) || 0
  }, [itemSizeCache.cache])

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / (typeof itemHeight === 'function' ? 50 : itemHeight)) - overscan)
    const end = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / (typeof itemHeight === 'function' ? 50 : itemHeight)) + overscan
    )
    
    return { start, end }
  }, [scrollTop, containerHeight, itemHeight, itemCount, overscan])

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const items = []
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const start = getItemOffset(i)
      const size = getItemSize(i)
      
      items.push({
        index: i,
        start,
        size,
        end: start + size,
      })
    }
    
    return items
  }, [visibleRange, getItemOffset, getItemSize])

  // Scroll event handler
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement
    const newScrollTop = target.scrollTop
    
    setScrollTop(newScrollTop)
    setIsScrolling(true)
    
    // Clear existing timeout
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current)
    }
    
    // Set scrolling to false after delay
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, scrollingDelay)
  }, [scrollingDelay])

  // Scroll to specific index
  const scrollToIndex = useCallback((
    index: number, 
    align: 'start' | 'center' | 'end' | 'auto' = 'auto'
  ) => {
    const scrollElement = getScrollElement?.() || document.documentElement
    const itemOffset = getItemOffset(index)
    const itemSize = getItemSize(index)
    
    let scrollTo = itemOffset
    
    switch (align) {
      case 'center':
        scrollTo = itemOffset - (containerHeight - itemSize) / 2
        break
      case 'end':
        scrollTo = itemOffset - containerHeight + itemSize
        break
      case 'auto':
        if (itemOffset < scrollTop) {
          scrollTo = itemOffset
        } else if (itemOffset + itemSize > scrollTop + containerHeight) {
          scrollTo = itemOffset - containerHeight + itemSize
        } else {
          return // Already visible
        }
        break
    }
    
    scrollElement.scrollTo({
      top: Math.max(0, scrollTo),
      behavior: 'smooth',
    })
  }, [getScrollElement, getItemOffset, getItemSize, containerHeight, scrollTop])

  // Scroll to specific offset
  const scrollToOffset = useCallback((offset: number) => {
    const scrollElement = getScrollElement?.() || document.documentElement
    scrollElement.scrollTo({
      top: Math.max(0, offset),
      behavior: 'smooth',
    })
  }, [getScrollElement])

  // Set up scroll listener
  useEffect(() => {
    const scrollElement = getScrollElement?.() || window
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current)
      }
    }
  }, [handleScroll, getScrollElement])

  return {
    virtualItems,
    totalSize: itemSizeCache.totalSize,
    scrollToIndex,
    scrollToOffset,
    isScrolling,
  }
}

// Hook for dynamic item heights
export const useDynamicVirtualScroll = ({
  containerHeight,
  itemCount,
  estimateItemSize,
  overscan = 5,
  scrollingDelay = 150,
  getScrollElement,
}: {
  containerHeight: number
  itemCount: number
  estimateItemSize: (index: number) => number
  overscan?: number
  scrollingDelay?: number
  getScrollElement?: () => HTMLElement | null
}) => {
  const [itemSizes, setItemSizes] = useState<Map<number, number>>(new Map())
  const measurementCache = useRef<Map<number, number>>(new Map())

  const measureItem = useCallback((index: number, size: number) => {
    measurementCache.current.set(index, size)
    setItemSizes(new Map(measurementCache.current))
  }, [])

  const getItemSize = useCallback((index: number) => {
    return itemSizes.get(index) ?? estimateItemSize(index)
  }, [itemSizes, estimateItemSize])

  const virtualScroll = useVirtualScroll({
    itemHeight: getItemSize,
    containerHeight,
    itemCount,
    overscan,
    scrollingDelay,
    getScrollElement,
  })

  return {
    ...virtualScroll,
    measureItem,
  }
}

// Component for measuring item sizes
export const VirtualScrollItem: React.FC<{
  index: number
  measureItem: (index: number, size: number) => void
  children: React.ReactNode
  style?: React.CSSProperties
}> = ({ index, measureItem, children, style }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      const resizeObserver = new ResizeObserver(([entry]) => {
        measureItem(index, entry.contentRect.height)
      })
      
      resizeObserver.observe(ref.current)
      
      return () => resizeObserver.disconnect()
    }
  }, [index, measureItem])

  return (
    <div ref={ref} style={style}>
      {children}
    </div>
  )
}