import { useCallback, useMemo, useRef, useState, useEffect } from 'react'

// Deep comparison for complex objects
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
        return false
      }
    }
    
    return true
  }
  
  return false
}

// Memoization with custom equality function
export const useDeepMemo = <T>(factory: () => T, deps: React.DependencyList): T => {
  const ref = useRef<{ deps: React.DependencyList; value: T }>()
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    }
  }
  
  return ref.current.value
}

// Memoized callback with deep comparison
export const useDeepCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useDeepMemo(() => callback, deps)
}

// Debounced value hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttled callback hook
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now())
  
  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}

// Memoized expensive computation with cache
export const useExpensiveComputation = <T, Args extends any[]>(
  computeFn: (...args: Args) => T,
  args: Args,
  cacheSize = 10
): T => {
  const cache = useRef<Map<string, T>>(new Map())
  
  return useMemo(() => {
    const key = JSON.stringify(args)
    
    if (cache.current.has(key)) {
      return cache.current.get(key)!
    }
    
    const result = computeFn(...args)
    
    // Implement LRU cache
    if (cache.current.size >= cacheSize) {
      const firstKey = cache.current.keys().next().value
      cache.current.delete(firstKey)
    }
    
    cache.current.set(key, result)
    return result
  }, [computeFn, args, cacheSize])
}

// Memoized async computation
export const useAsyncMemo = <T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList,
  initialValue?: T
): { data: T | undefined; loading: boolean; error: Error | null } => {
  const [state, setState] = useState<{
    data: T | undefined
    loading: boolean
    error: Error | null
  }>({
    data: initialValue,
    loading: false,
    error: null,
  })

  const memoizedAsyncFn = useCallback(asyncFn, deps)

  useEffect(() => {
    let cancelled = false
    
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    memoizedAsyncFn()
      .then(data => {
        if (!cancelled) {
          setState({ data, loading: false, error: null })
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState(prev => ({ ...prev, loading: false, error }))
        }
      })
    
    return () => {
      cancelled = true
    }
  }, [memoizedAsyncFn])

  return state
}

// Memoized selector for complex state
export const useSelector = <State, Selected>(
  state: State,
  selector: (state: State) => Selected,
  equalityFn: (a: Selected, b: Selected) => boolean = Object.is
): Selected => {
  const selectedRef = useRef<Selected>()
  
  const selected = useMemo(() => selector(state), [state, selector])
  
  if (selectedRef.current === undefined || !equalityFn(selectedRef.current, selected)) {
    selectedRef.current = selected
  }
  
  return selectedRef.current
}

// Performance monitoring hook
export const usePerformanceMonitor = (name: string, threshold = 16) => {
  const startTime = useRef<number>()
  
  const start = useCallback(() => {
    startTime.current = performance.now()
  }, [])
  
  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current
      
      if (duration > threshold) {
        console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`)
      }
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        // Analytics.track('performance', { name, duration })
      }
      
      startTime.current = undefined
      return duration
    }
    return 0
  }, [name, threshold])
  
  return { start, end }
}

// Memoized component wrapper
export const memo = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, propsAreEqual || deepEqual)
}

// Hook for memoizing render functions
export const useRenderMemo = <T extends any[]>(
  renderFn: (...args: T) => React.ReactNode,
  deps: T
): React.ReactNode => {
  return useMemo(() => renderFn(...deps), deps)
}