import { useEffect, useState, useCallback } from 'react'
import { trackPerformance, getCurrentWebVitals, getPerformanceScore, WebVitalsMetrics } from '../utils/webVitals'

export interface PerformanceData {
  webVitals: WebVitalsMetrics
  performanceScore: number
  customMetrics: Record<string, number>
}

export const usePerformanceMonitoring = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    webVitals: {
      CLS: null,
      FID: null,
      FCP: null,
      LCP: null,
      TTFB: null,
    },
    performanceScore: 0,
    customMetrics: {},
  })
  
  const [isMonitoring, setIsMonitoring] = useState(false)
  
  // Update performance data periodically
  useEffect(() => {
    const updatePerformanceData = () => {
      setPerformanceData({
        webVitals: getCurrentWebVitals(),
        performanceScore: getPerformanceScore(),
        customMetrics: {}, // This would be populated from a custom metrics store
      })
    }
    
    // Initial update
    updatePerformanceData()
    
    // Update every 10 seconds
    const interval = setInterval(updatePerformanceData, 10000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Track message send performance
  const trackMessageSend = useCallback((startTime: number) => {
    const latency = Date.now() - startTime
    trackPerformance.messageSend(latency)
    return latency
  }, [])
  
  // Track chat load performance
  const trackChatLoad = useCallback((startTime: number) => {
    const loadTime = Date.now() - startTime
    trackPerformance.chatLoad(loadTime)
    return loadTime
  }, [])
  
  // Track search performance
  const trackSearchResponse = useCallback((startTime: number) => {
    const responseTime = Date.now() - startTime
    trackPerformance.searchResponse(responseTime)
    return responseTime
  }, [])
  
  // Track custom metrics
  const trackCustomMetric = useCallback((name: string, value: number, context?: Record<string, any>) => {
    trackPerformance.custom(name, value, context)
  }, [])
  
  // Start/stop monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
    console.log('Performance monitoring started')
  }, [])
  
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    console.log('Performance monitoring stopped')
  }, [])
  
  // Get performance insights
  const getPerformanceInsights = useCallback(() => {
    const { webVitals, performanceScore } = performanceData
    const insights = []
    
    // LCP insights
    if (webVitals.LCP !== null) {
      if (webVitals.LCP > 4000) {
        insights.push({
          metric: 'LCP',
          severity: 'high',
          message: 'Largest Contentful Paint is very slow. Consider optimizing images and reducing server response time.',
        })
      } else if (webVitals.LCP > 2500) {
        insights.push({
          metric: 'LCP',
          severity: 'medium',
          message: 'Largest Contentful Paint could be improved. Consider image optimization.',
        })
      }
    }
    
    // FID insights
    if (webVitals.FID !== null) {
      if (webVitals.FID > 300) {
        insights.push({
          metric: 'FID',
          severity: 'high',
          message: 'First Input Delay is high. Consider reducing JavaScript execution time.',
        })
      } else if (webVitals.FID > 100) {
        insights.push({
          metric: 'FID',
          severity: 'medium',
          message: 'First Input Delay could be improved. Consider code splitting.',
        })
      }
    }
    
    // CLS insights
    if (webVitals.CLS !== null) {
      if (webVitals.CLS > 0.25) {
        insights.push({
          metric: 'CLS',
          severity: 'high',
          message: 'Cumulative Layout Shift is high. Ensure images and ads have dimensions.',
        })
      } else if (webVitals.CLS > 0.1) {
        insights.push({
          metric: 'CLS',
          severity: 'medium',
          message: 'Cumulative Layout Shift could be improved. Reserve space for dynamic content.',
        })
      }
    }
    
    // Overall performance
    if (performanceScore < 50) {
      insights.push({
        metric: 'overall',
        severity: 'high',
        message: 'Overall performance is poor. Multiple optimizations needed.',
      })
    } else if (performanceScore < 80) {
      insights.push({
        metric: 'overall',
        severity: 'medium',
        message: 'Performance is acceptable but could be improved.',
      })
    }
    
    return insights
  }, [performanceData])
  
  return {
    performanceData,
    isMonitoring,
    trackMessageSend,
    trackChatLoad,
    trackSearchResponse,
    trackCustomMetric,
    startMonitoring,
    stopMonitoring,
    getPerformanceInsights,
  }
}