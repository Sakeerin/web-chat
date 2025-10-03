import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useDebounce, useThrottle } from './useMemoization'

// Hook for optimizing expensive renders
export const useOptimizedRender = <T>(
  data: T,
  renderFn: (data: T) => React.ReactNode,
  options: {
    debounceMs?: number
    throttleMs?: number
    shouldUpdate?: (prev: T, next: T) => boolean
  } = {}
) => {
  const { debounceMs = 0, throttleMs = 0, shouldUpdate } = options
  const prevDataRef = useRef<T>(data)
  const [renderData, setRenderData] = useState<T>(data)

  // Debounce data updates if specified
  const debouncedData = useDebounce(data, debounceMs)
  const finalData = debounceMs > 0 ? debouncedData : data

  // Update render data only if it should update
  useEffect(() => {
    if (!shouldUpdate || shouldUpdate(prevDataRef.current, finalData)) {
      setRenderData(finalData)
      prevDataRef.current = finalData
    }
  }, [finalData, shouldUpdate])

  // Throttle the render function if specified
  const throttledRenderFn = useThrottle(renderFn, throttleMs)
  const finalRenderFn = throttleMs > 0 ? throttledRenderFn : renderFn

  return useMemo(() => finalRenderFn(renderData), [finalRenderFn, renderData])
}

// Hook for optimizing list renders
export const useOptimizedList = <T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  options: {
    keyExtractor?: (item: T, index: number) => string | number
    shouldUpdateItem?: (prev: T, next: T) => boolean
    maxRenderCount?: number
  } = {}
) => {
  const { keyExtractor = (_, index) => index, shouldUpdateItem, maxRenderCount } = options
  
  // Limit the number of items to render if specified
  const limitedItems = useMemo(() => {
    return maxRenderCount ? items.slice(0, maxRenderCount) : items
  }, [items, maxRenderCount])

  // Memoize individual item renders
  const memoizedItems = useMemo(() => {
    return limitedItems.map((item, index) => {
      const key = keyExtractor(item, index)
      return {
        key,
        element: renderItem(item, index),
        item,
      }
    })
  }, [limitedItems, renderItem, keyExtractor])

  return memoizedItems
}

// Hook for intersection-based rendering (render only visible items)
export const useIntersectionRender = <T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  options: {
    rootMargin?: string
    threshold?: number
    keyExtractor?: (item: T, index: number) => string | number
  } = {}
) => {
  const { rootMargin = '100px', threshold = 0.1, keyExtractor = (_, index) => index } = options
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set())
  const observerRef = useRef<IntersectionObserver>()
  const elementRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Create intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleIndices(prev => {
          const newVisible = new Set(prev)
          entries.forEach(entry => {
            const index = parseInt(entry.target.getAttribute('data-index') || '0')
            if (entry.isIntersecting) {
              newVisible.add(index)
            } else {
              newVisible.delete(index)
            }
          })
          return newVisible
        })
      },
      { rootMargin, threshold }
    )

    return () => observerRef.current?.disconnect()
  }, [rootMargin, threshold])

  // Observe elements
  const observeElement = useCallback((element: HTMLElement | null, index: number) => {
    if (!element || !observerRef.current) return

    element.setAttribute('data-index', index.toString())
    observerRef.current.observe(element)
    elementRefs.current.set(index, element)

    return () => {
      observerRef.current?.unobserve(element)
      elementRefs.current.delete(index)
    }
  }, [])

  // Render items with intersection observation
  const renderedItems = useMemo(() => {
    return items.map((item, index) => {
      const key = keyExtractor(item, index)
      const isVisible = visibleIndices.has(index)
      
      return {
        key,
        element: isVisible ? renderItem(item, index) : null,
        observeRef: (el: HTMLElement | null) => observeElement(el, index),
        isVisible,
      }
    })
  }, [items, renderItem, keyExtractor, visibleIndices, observeElement])

  return renderedItems
}

// Hook for batching state updates
export const useBatchedUpdates = <T>(initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue)
  const pendingUpdatesRef = useRef<((prev: T) => T)[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()

  const batchUpdate = useCallback((updater: (prev: T) => T) => {
    pendingUpdatesRef.current.push(updater)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setValue(prev => {
        let result = prev
        pendingUpdatesRef.current.forEach(update => {
          result = update(result)
        })
        pendingUpdatesRef.current = []
        return result
      })
    }, 0) // Batch in next tick
  }, [])

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      setValue(prev => {
        let result = prev
        pendingUpdatesRef.current.forEach(update => {
          result = update(result)
        })
        pendingUpdatesRef.current = []
        return result
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [value, batchUpdate, flushUpdates] as const
}

// Hook for optimizing re-renders with shallow comparison
export const useShallowMemo = <T extends Record<string, any>>(obj: T): T => {
  const ref = useRef<T>(obj)
  
  const isShallowEqual = (a: T, b: T): boolean => {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    for (const key of keysA) {
      if (a[key] !== b[key]) return false
    }
    
    return true
  }
  
  if (!isShallowEqual(ref.current, obj)) {
    ref.current = obj
  }
  
  return ref.current
}

// Hook for render counting (development only)
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0)
  
  useEffect(() => {
    renderCount.current++
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times`)
    }
  })
  
  return renderCount.current
}