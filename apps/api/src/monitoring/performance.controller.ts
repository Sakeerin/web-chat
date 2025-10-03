import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PerformanceService } from './performance.service'

@ApiTags('monitoring')
@Controller('monitoring')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health information' })
  getHealth() {
    const summary = this.performanceService.getPerformanceSummary()
    
    return {
      status: summary?.status || 'unknown',
      timestamp: new Date().toISOString(),
      uptime: summary?.uptime || 0,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get current performance metrics' })
  @ApiResponse({ status: 200, description: 'Current performance metrics' })
  getMetrics() {
    const current = this.performanceService.getCurrentMetrics()
    const summary = this.performanceService.getPerformanceSummary()
    
    return {
      current,
      summary,
      timestamp: new Date().toISOString(),
    }
  }

  @Get('metrics/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get performance metrics history' })
  @ApiResponse({ status: 200, description: 'Performance metrics history' })
  getMetricsHistory(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100
    const history = this.performanceService.getMetricsHistory(limitNum)
    
    return {
      metrics: history,
      count: history.length,
      timestamp: new Date().toISOString(),
    }
  }

  @Get('performance/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get performance summary for monitoring dashboards' })
  @ApiResponse({ status: 200, description: 'Performance summary' })
  getPerformanceSummary() {
    const summary = this.performanceService.getPerformanceSummary()
    const current = this.performanceService.getCurrentMetrics()
    
    if (!summary || !current) {
      return {
        status: 'initializing',
        message: 'Performance metrics are being collected',
      }
    }
    
    return {
      ...summary,
      details: {
        memory: {
          used: current.memory.used,
          total: current.memory.total,
          heap: current.memory.heap,
        },
        cpu: {
          usage: current.cpu.usage,
          loadAverage: current.cpu.loadAverage,
        },
        database: {
          queryTime: current.database.queryTime,
          slowQueries: current.database.slowQueries,
        },
        websocket: {
          activeConnections: current.websocket.activeConnections,
          messagesPerSecond: current.websocket.messagesPerSecond,
          averageLatency: current.websocket.averageLatency,
        },
      },
      timestamp: current.timestamp,
    }
  }
}