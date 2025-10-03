import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as os from 'os'
import * as process from 'process'

export interface PerformanceMetrics {
  timestamp: Date
  memory: {
    used: number
    total: number
    heap: {
      used: number
      total: number
    }
    external: number
  }
  cpu: {
    usage: number
    loadAverage: number[]
  }
  system: {
    uptime: number
    platform: string
    arch: string
    nodeVersion: string
  }
  application: {
    activeConnections: number
    totalRequests: number
    averageResponseTime: number
    errorRate: number
  }
  database: {
    activeConnections: number
    queryTime: number
    slowQueries: number
  }
  websocket: {
    activeConnections: number
    messagesPerSecond: number
    averageLatency: number
  }
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name)
  private metrics: PerformanceMetrics[] = []
  private readonly maxMetricsHistory = 1000
  
  // Performance counters
  private totalRequests = 0
  private totalResponseTime = 0
  private totalErrors = 0
  private activeHttpConnections = 0
  private activeWsConnections = 0
  private messagesPerSecond = 0
  private totalMessages = 0
  private wsLatencySum = 0
  private wsLatencyCount = 0
  private dbQueryTime = 0
  private dbQueryCount = 0
  private slowQueryCount = 0
  
  constructor(private configService: ConfigService) {
    // Start metrics collection
    this.startMetricsCollection()
  }
  
  private startMetricsCollection() {
    // Collect metrics every 10 seconds
    setInterval(() => {
      this.collectMetrics()
    }, 10000)
    
    // Reset per-second counters every second
    setInterval(() => {
      this.messagesPerSecond = 0
    }, 1000)
  }
  
  private collectMetrics() {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    const loadAverage = os.loadavg()
    
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      memory: {
        used: memoryUsage.rss,
        total: os.totalmem(),
        heap: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
        },
        external: memoryUsage.external,
      },
      cpu: {
        usage: this.calculateCpuUsage(cpuUsage),
        loadAverage,
      },
      system: {
        uptime: process.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
      },
      application: {
        activeConnections: this.activeHttpConnections,
        totalRequests: this.totalRequests,
        averageResponseTime: this.totalRequests > 0 ? this.totalResponseTime / this.totalRequests : 0,
        errorRate: this.totalRequests > 0 ? this.totalErrors / this.totalRequests : 0,
      },
      database: {
        activeConnections: 0, // Will be populated by database service
        queryTime: this.dbQueryCount > 0 ? this.dbQueryTime / this.dbQueryCount : 0,
        slowQueries: this.slowQueryCount,
      },
      websocket: {
        activeConnections: this.activeWsConnections,
        messagesPerSecond: this.messagesPerSecond,
        averageLatency: this.wsLatencyCount > 0 ? this.wsLatencySum / this.wsLatencyCount : 0,
      },
    }
    
    this.addMetrics(metrics)
    
    // Log performance warnings
    this.checkPerformanceThresholds(metrics)
  }
  
  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simple CPU usage calculation
    const totalUsage = cpuUsage.user + cpuUsage.system
    return (totalUsage / 1000000) / os.cpus().length // Convert to percentage
  }
  
  private addMetrics(metrics: PerformanceMetrics) {
    this.metrics.push(metrics)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }
  }
  
  private checkPerformanceThresholds(metrics: PerformanceMetrics) {
    // Memory usage warning (> 1GB)
    if (metrics.memory.used > 1024 * 1024 * 1024) {
      this.logger.warn(`High memory usage: ${(metrics.memory.used / 1024 / 1024).toFixed(2)}MB`)
    }
    
    // CPU usage warning (> 80%)
    if (metrics.cpu.usage > 80) {
      this.logger.warn(`High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`)
    }
    
    // Response time warning (> 500ms)
    if (metrics.application.averageResponseTime > 500) {
      this.logger.warn(`High response time: ${metrics.application.averageResponseTime.toFixed(2)}ms`)
    }
    
    // Error rate warning (> 5%)
    if (metrics.application.errorRate > 0.05) {
      this.logger.warn(`High error rate: ${(metrics.application.errorRate * 100).toFixed(2)}%`)
    }
    
    // WebSocket latency warning (> 200ms)
    if (metrics.websocket.averageLatency > 200) {
      this.logger.warn(`High WebSocket latency: ${metrics.websocket.averageLatency.toFixed(2)}ms`)
    }
  }
  
  // Public methods for updating metrics
  recordHttpRequest(responseTime: number, isError: boolean = false) {
    this.totalRequests++
    this.totalResponseTime += responseTime
    if (isError) {
      this.totalErrors++
    }
  }
  
  recordHttpConnection(delta: number) {
    this.activeHttpConnections += delta
  }
  
  recordWebSocketConnection(delta: number) {
    this.activeWsConnections += delta
  }
  
  recordMessage(latency?: number) {
    this.messagesPerSecond++
    this.totalMessages++
    
    if (latency !== undefined) {
      this.wsLatencySum += latency
      this.wsLatencyCount++
    }
  }
  
  recordDatabaseQuery(queryTime: number, isSlow: boolean = false) {
    this.dbQueryTime += queryTime
    this.dbQueryCount++
    
    if (isSlow) {
      this.slowQueryCount++
    }
  }
  
  // Get current metrics
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }
  
  // Get metrics history
  getMetricsHistory(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit)
  }
  
  // Get performance summary
  getPerformanceSummary() {
    const current = this.getCurrentMetrics()
    if (!current) return null
    
    return {
      status: this.getSystemStatus(current),
      memory: {
        usedMB: Math.round(current.memory.used / 1024 / 1024),
        usagePercent: Math.round((current.memory.used / current.memory.total) * 100),
      },
      cpu: {
        usage: Math.round(current.cpu.usage),
        loadAverage: current.cpu.loadAverage[0],
      },
      application: {
        activeConnections: current.application.activeConnections,
        averageResponseTime: Math.round(current.application.averageResponseTime),
        errorRate: Math.round(current.application.errorRate * 100),
      },
      websocket: {
        activeConnections: current.websocket.activeConnections,
        messagesPerSecond: current.websocket.messagesPerSecond,
        averageLatency: Math.round(current.websocket.averageLatency),
      },
      uptime: Math.round(current.system.uptime),
    }
  }
  
  private getSystemStatus(metrics: PerformanceMetrics): 'healthy' | 'warning' | 'critical' {
    const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100
    const cpuUsage = metrics.cpu.usage
    const errorRate = metrics.application.errorRate * 100
    const responseTime = metrics.application.averageResponseTime
    
    // Critical conditions
    if (memoryUsagePercent > 90 || cpuUsage > 95 || errorRate > 10 || responseTime > 1000) {
      return 'critical'
    }
    
    // Warning conditions
    if (memoryUsagePercent > 70 || cpuUsage > 80 || errorRate > 5 || responseTime > 500) {
      return 'warning'
    }
    
    return 'healthy'
  }
  
  // Reset metrics (for testing)
  resetMetrics() {
    this.metrics = []
    this.totalRequests = 0
    this.totalResponseTime = 0
    this.totalErrors = 0
    this.activeHttpConnections = 0
    this.activeWsConnections = 0
    this.messagesPerSecond = 0
    this.totalMessages = 0
    this.wsLatencySum = 0
    this.wsLatencyCount = 0
    this.dbQueryTime = 0
    this.dbQueryCount = 0
    this.slowQueryCount = 0
  }
}