import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals'

export interface WebVitalsMetrics {
  CLS: number | null // Cumulative Layout Shift
  FID: number | null // First Input Delay
  FCP: number | null // First Contentful Paint
  LCP: number | null // Largest Contentful Paint
  TTFB: number | null // Time to First Byte
}

export interface PerformanceEntry {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
  url: string
  userAgent: string
}

class WebVitalsCollector {
  private metrics: WebVitalsMetrics = {
    CLS: null,
    FID: null,
    FCP: null,
    LCP: null,
    TTFB: null,
  }
  
  private entries: PerformanceEntry[] = []
  private apiEndpoint = '/api/monitoring/web-vitals'
  
  constructor() {
    this.initializeCollection()
  }
  
  private initializeCollection() {
    // Collect Core Web Vitals
    getCLS(this.handleMetric.bind(this))
    getFID(this.handleMetric.bind(this))
    getFCP(this.handleMetric.bind(this))
    getLCP(this.handleMetric.bind(this))
    getTTFB(this.handleMetric.bind(this))
    
    // Send metrics periodically
    setInterval(() => {
      this.sendMetrics()
    }, 30000) // Send every 30 seconds
    
    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics(true)
    })
  }
  
  private handleMetric(metric: Metric) {
    const entry: PerformanceEntry = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }
    
    // Update metrics object
    this.metrics[metric.name as keyof WebVitalsMetrics] = metric.value
    
    // Add to entries
    this.entries.push(entry)
    
    // Log performance issues
    if (entry.rating === 'poor') {
      console.warn(`Poor ${metric.name} performance:`, metric.value)
    }
    
    // Send critical metrics immediately
    if (entry.rating === 'poor' && (metric.name === 'LCP' || metric.name === 'FID')) {
      this.sendMetrics(true)
    }
  }
  
  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    }
    
    const threshold = thresholds[metricName as keyof typeof thresholds]
    if (!threshold) return 'good'
    
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }
  
  private async sendMetrics(immediate = false) {
    if (this.entries.length === 0) return
    
    const payload = {
      metrics: this.metrics,
      entries: [...this.entries],
      session: {
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: this.getConnectionInfo(),
      },
    }
    
    try {
      if (immediate && 'sendBeacon' in navigator) {
        // Use sendBeacon for immediate sending (e.g., page unload)
        navigator.sendBeacon(
          this.apiEndpoint,
          JSON.stringify(payload)
        )
      } else {
        // Use fetch for regular sending
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      }
      
      // Clear sent entries
      this.entries = []
      
    } catch (error) {
      console.error('Failed to send Web Vitals metrics:', error)
    }
  }
  
  private getConnectionInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      }
    }
    
    return null
  }
  
  // Public methods
  getCurrentMetrics(): WebVitalsMetrics {
    return { ...this.metrics }
  }
  
  getPerformanceScore(): number {
    const scores = []
    
    // Calculate individual scores (0-100)
    if (this.metrics.LCP !== null) {
      scores.push(this.metrics.LCP <= 2500 ? 100 : this.metrics.LCP <= 4000 ? 50 : 0)
    }
    
    if (this.metrics.FID !== null) {
      scores.push(this.metrics.FID <= 100 ? 100 : this.metrics.FID <= 300 ? 50 : 0)
    }
    
    if (this.metrics.CLS !== null) {
      scores.push(this.metrics.CLS <= 0.1 ? 100 : this.metrics.CLS <= 0.25 ? 50 : 0)
    }
    
    if (this.metrics.FCP !== null) {
      scores.push(this.metrics.FCP <= 1800 ? 100 : this.metrics.FCP <= 3000 ? 50 : 0)
    }
    
    if (this.metrics.TTFB !== null) {
      scores.push(this.metrics.TTFB <= 800 ? 100 : this.metrics.TTFB <= 1800 ? 50 : 0)
    }
    
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  }
  
  // Custom performance tracking
  trackCustomMetric(name: string, value: number, context?: Record<string, any>) {
    const entry: PerformanceEntry = {
      name: `custom_${name}`,
      value,
      rating: 'good', // Custom metrics don't have predefined ratings
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }
    
    this.entries.push({
      ...entry,
      ...context,
    } as PerformanceEntry)
  }
  
  // Track specific app metrics
  trackMessageSendLatency(latency: number) {
    this.trackCustomMetric('message_send_latency', latency, {
      rating: latency <= 150 ? 'good' : latency <= 350 ? 'needs-improvement' : 'poor'
    })
  }
  
  trackChatLoadTime(loadTime: number) {
    this.trackCustomMetric('chat_load_time', loadTime, {
      rating: loadTime <= 1200 ? 'good' : loadTime <= 2000 ? 'needs-improvement' : 'poor'
    })
  }
  
  trackSearchResponseTime(responseTime: number) {
    this.trackCustomMetric('search_response_time', responseTime, {
      rating: responseTime <= 300 ? 'good' : responseTime <= 500 ? 'needs-improvement' : 'poor'
    })
  }
}

// Create singleton instance
export const webVitalsCollector = new WebVitalsCollector()

// Export for use in components
export const trackPerformance = {
  messageSend: (latency: number) => webVitalsCollector.trackMessageSendLatency(latency),
  chatLoad: (loadTime: number) => webVitalsCollector.trackChatLoadTime(loadTime),
  searchResponse: (responseTime: number) => webVitalsCollector.trackSearchResponseTime(responseTime),
  custom: (name: string, value: number, context?: Record<string, any>) => 
    webVitalsCollector.trackCustomMetric(name, value, context),
}

// Export current metrics getter
export const getCurrentWebVitals = () => webVitalsCollector.getCurrentMetrics()
export const getPerformanceScore = () => webVitalsCollector.getPerformanceScore()