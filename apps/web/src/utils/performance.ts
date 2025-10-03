// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()
  private observers: Map<string, PerformanceObserver> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Measure function execution time
  measureFunction<T extends (...args: any[]) => any>(
    name: string,
    fn: T
  ): T {
    return ((...args: any[]) => {
      const start = performance.now()
      const result = fn(...args)
      const end = performance.now()
      
      this.recordMetric(name, end - start)
      
      return result
    }) as T
  }

  // Measure async function execution time
  measureAsyncFunction<T extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: T
  ): T {
    return (async (...args: any[]) => {
      const start = performance.now()
      const result = await fn(...args)
      const end = performance.now()
      
      this.recordMetric(name, end - start)
      
      return result
    }) as T
  }

  // Start measuring a custom metric
  startMeasure(name: string): () => number {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return duration
    }
  }

  // Record a metric value
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 measurements to prevent memory leaks
    if (values.length > 100) {
      values.shift()
    }
    
    // Log slow operations
    if (value > 100) {
      console.warn(`Slow operation detected: ${name} took ${value.toFixed(2)}ms`)
    }
  }

  // Get metric statistics
  getMetricStats(name: string): {
    count: number
    min: number
    max: number
    avg: number
    p95: number
  } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null
    
    const sorted = [...values].sort((a, b) => a - b)
    const count = sorted.length
    const min = sorted[0]
    const max = sorted[count - 1]
    const avg = sorted.reduce((sum, val) => sum + val, 0) / count
    const p95Index = Math.floor(count * 0.95)
    const p95 = sorted[p95Index] || max
    
    return { count, min, max, avg, p95 }
  }

  // Monitor Web Vitals
  monitorWebVitals(): void {
    // Largest Contentful Paint
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1]
      this.recordMetric('LCP', lastEntry.startTime)
    })

    // First Input Delay
    this.observePerformanceEntry('first-input', (entries) => {
      entries.forEach(entry => {
        this.recordMetric('FID', entry.processingStart - entry.startTime)
      })
    })

    // Cumulative Layout Shift
    this.observePerformanceEntry('layout-shift', (entries) => {
      let clsValue = 0
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      this.recordMetric('CLS', clsValue)
    })

    // Navigation timing
    if (performance.getEntriesByType) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart)
        this.recordMetric('DOMContentLoaded', navigation.domContentLoadedEventEnd - navigation.navigationStart)
        this.recordMetric('Load', navigation.loadEventEnd - navigation.navigationStart)
      }
    }
  }

  // Monitor resource loading
  monitorResourceLoading(): void {
    this.observePerformanceEntry('resource', (entries) => {
      entries.forEach(entry => {
        const resource = entry as PerformanceResourceTiming
        const duration = resource.responseEnd - resource.requestStart
        
        // Categorize resources
        let category = 'other'
        if (resource.name.includes('.js')) category = 'script'
        else if (resource.name.includes('.css')) category = 'stylesheet'
        else if (resource.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) category = 'image'
        else if (resource.name.includes('/api/')) category = 'api'
        
        this.recordMetric(`resource-${category}`, duration)
        
        // Log slow resources
        if (duration > 1000) {
          console.warn(`Slow resource: ${resource.name} took ${duration.toFixed(2)}ms`)
        }
      })
    })
  }

  // Monitor memory usage
  monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      setInterval(() => {
        this.recordMetric('memory-used', memory.usedJSHeapSize / 1024 / 1024) // MB
        this.recordMetric('memory-total', memory.totalJSHeapSize / 1024 / 1024) // MB
        this.recordMetric('memory-limit', memory.jsHeapSizeLimit / 1024 / 1024) // MB
      }, 30000) // Every 30 seconds
    }
  }

  // Generic performance observer
  private observePerformanceEntry(
    entryType: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries())
      })
      
      observer.observe({ entryTypes: [entryType] })
      this.observers.set(entryType, observer)
    } catch (error) {
      console.warn(`Could not observe ${entryType}:`, error)
    }
  }

  // Get all metrics summary
  getAllMetrics(): Record<string, any> {
    const summary: Record<string, any> = {}
    
    for (const [name] of this.metrics) {
      summary[name] = this.getMetricStats(name)
    }
    
    return summary
  }

  // Send metrics to analytics (implement based on your analytics provider)
  sendMetrics(): void {
    const metrics = this.getAllMetrics()
    
    // Example: Send to Google Analytics
    if (typeof gtag !== 'undefined') {
      Object.entries(metrics).forEach(([name, stats]) => {
        if (stats) {
          gtag('event', 'performance_metric', {
            metric_name: name,
            metric_value: Math.round(stats.avg),
            metric_p95: Math.round(stats.p95),
          })
        }
      })
    }
    
    // Example: Send to custom analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(error => {
        console.warn('Failed to send performance metrics:', error)
      })
    }
  }

  // Cleanup observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.metrics.clear()
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance()
  
  React.useEffect(() => {
    monitor.monitorWebVitals()
    monitor.monitorResourceLoading()
    monitor.monitorMemoryUsage()
    
    // Send metrics periodically
    const interval = setInterval(() => {
      monitor.sendMetrics()
    }, 60000) // Every minute
    
    return () => {
      clearInterval(interval)
      monitor.cleanup()
    }
  }, [monitor])
  
  return {
    measureFunction: monitor.measureFunction.bind(monitor),
    measureAsyncFunction: monitor.measureAsyncFunction.bind(monitor),
    startMeasure: monitor.startMeasure.bind(monitor),
    recordMetric: monitor.recordMetric.bind(monitor),
    getMetricStats: monitor.getMetricStats.bind(monitor),
    getAllMetrics: monitor.getAllMetrics.bind(monitor),
  }
}

// Performance decorator for class methods
export function performanceMonitor(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const metricName = name || `${target.constructor.name}.${propertyKey}`
    
    descriptor.value = function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance()
      const endMeasure = monitor.startMeasure(metricName)
      
      try {
        const result = originalMethod.apply(this, args)
        
        if (result instanceof Promise) {
          return result.finally(() => endMeasure())
        }
        
        endMeasure()
        return result
      } catch (error) {
        endMeasure()
        throw error
      }
    }
    
    return descriptor
  }
}

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  const monitor = PerformanceMonitor.getInstance()
  
  // Start monitoring immediately
  monitor.monitorWebVitals()
  monitor.monitorResourceLoading()
  monitor.monitorMemoryUsage()
  
  // Send initial metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      monitor.sendMetrics()
    }, 1000)
  })
  
  // Send metrics before page unload
  window.addEventListener('beforeunload', () => {
    monitor.sendMetrics()
  })
  
  return monitor
}