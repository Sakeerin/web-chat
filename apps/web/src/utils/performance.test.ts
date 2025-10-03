import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PerformanceMonitor } from './performance'

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
}

// Mock PerformanceObserver
class MockPerformanceObserver {
  callback: (list: any) => void
  
  constructor(callback: (list: any) => void) {
    this.callback = callback
  }
  
  observe() {}
  disconnect() {}
}

global.PerformanceObserver = MockPerformanceObserver as any
global.performance = mockPerformance as any

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor
  
  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance()
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    monitor.cleanup()
  })

  describe('measureFunction', () => {
    it('should measure function execution time', () => {
      const testFn = vi.fn(() => 'result')
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(150)
      
      const measuredFn = monitor.measureFunction('test-function', testFn)
      const result = measuredFn('arg1', 'arg2')
      
      expect(result).toBe('result')
      expect(testFn).toHaveBeenCalledWith('arg1', 'arg2')
      
      const stats = monitor.getMetricStats('test-function')
      expect(stats).toEqual({
        count: 1,
        min: 50,
        max: 50,
        avg: 50,
        p95: 50,
      })
    })
  })

  describe('measureAsyncFunction', () => {
    it('should measure async function execution time', async () => {
      const testFn = vi.fn(async () => 'async-result')
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(200)
      
      const measuredFn = monitor.measureAsyncFunction('test-async', testFn)
      const result = await measuredFn('arg1')
      
      expect(result).toBe('async-result')
      expect(testFn).toHaveBeenCalledWith('arg1')
      
      const stats = monitor.getMetricStats('test-async')
      expect(stats).toEqual({
        count: 1,
        min: 100,
        max: 100,
        avg: 100,
        p95: 100,
      })
    })
  })

  describe('startMeasure', () => {
    it('should measure custom operations', () => {
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(175)
      
      const endMeasure = monitor.startMeasure('custom-operation')
      const duration = endMeasure()
      
      expect(duration).toBe(75)
      
      const stats = monitor.getMetricStats('custom-operation')
      expect(stats).toEqual({
        count: 1,
        min: 75,
        max: 75,
        avg: 75,
        p95: 75,
      })
    })
  })

  describe('recordMetric', () => {
    it('should record and calculate statistics', () => {
      monitor.recordMetric('test-metric', 10)
      monitor.recordMetric('test-metric', 20)
      monitor.recordMetric('test-metric', 30)
      monitor.recordMetric('test-metric', 40)
      monitor.recordMetric('test-metric', 50)
      
      const stats = monitor.getMetricStats('test-metric')
      expect(stats).toEqual({
        count: 5,
        min: 10,
        max: 50,
        avg: 30,
        p95: 50,
      })
    })

    it('should limit stored values to prevent memory leaks', () => {
      // Record more than 100 values
      for (let i = 0; i < 150; i++) {
        monitor.recordMetric('memory-test', i)
      }
      
      const stats = monitor.getMetricStats('memory-test')
      expect(stats?.count).toBe(100) // Should be limited to 100
    })

    it('should warn about slow operations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      monitor.recordMetric('slow-operation', 150)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Slow operation detected: slow-operation took 150.00ms'
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('getMetricStats', () => {
    it('should return null for non-existent metrics', () => {
      const stats = monitor.getMetricStats('non-existent')
      expect(stats).toBeNull()
    })

    it('should calculate P95 correctly', () => {
      // Add 100 values from 1 to 100
      for (let i = 1; i <= 100; i++) {
        monitor.recordMetric('p95-test', i)
      }
      
      const stats = monitor.getMetricStats('p95-test')
      // P95 calculation: Math.floor(100 * 0.95) = 95, so index 95 (0-based) = value 96
      expect(stats?.p95).toBe(96)
    })
  })

  describe('getAllMetrics', () => {
    it('should return all recorded metrics', () => {
      monitor.recordMetric('metric1', 10)
      monitor.recordMetric('metric2', 20)
      
      const allMetrics = monitor.getAllMetrics()
      
      expect(Object.keys(allMetrics)).toContain('metric1')
      expect(Object.keys(allMetrics)).toContain('metric2')
      expect(allMetrics.metric1?.avg).toBe(10)
      expect(allMetrics.metric2?.avg).toBe(20)
    })
  })

  describe('cleanup', () => {
    it('should clear all metrics and observers', () => {
      monitor.recordMetric('test', 10)
      
      expect(monitor.getMetricStats('test')).not.toBeNull()
      
      monitor.cleanup()
      
      expect(monitor.getMetricStats('test')).toBeNull()
    })
  })
})

describe('Performance utilities', () => {
  it('should handle missing performance API gracefully', () => {
    const originalPerformance = global.performance
    delete (global as any).performance
    
    expect(() => {
      const monitor = PerformanceMonitor.getInstance()
      monitor.recordMetric('test', 10)
    }).not.toThrow()
    
    global.performance = originalPerformance
  })

  it('should handle missing PerformanceObserver gracefully', () => {
    const originalObserver = global.PerformanceObserver
    delete (global as any).PerformanceObserver
    
    expect(() => {
      const monitor = PerformanceMonitor.getInstance()
      monitor.monitorWebVitals()
    }).not.toThrow()
    
    global.PerformanceObserver = originalObserver
  })
})