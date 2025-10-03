import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { PerformanceService } from './performance.service'

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name)

  constructor(private readonly performanceService: PerformanceService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()
    
    // Track active connection
    this.performanceService.recordHttpConnection(1)
    
    // Override res.end to capture response time
    const originalEnd = res.end
    res.end = function(chunk?: any, encoding?: any) {
      const responseTime = Date.now() - startTime
      const isError = res.statusCode >= 400
      
      // Record metrics
      this.performanceService.recordHttpRequest(responseTime, isError)
      this.performanceService.recordHttpConnection(-1)
      
      // Log slow requests
      if (responseTime > 1000) {
        this.logger.warn(`Slow request: ${req.method} ${req.url} - ${responseTime}ms`)
      }
      
      // Call original end method
      originalEnd.call(res, chunk, encoding)
    }.bind(this)
    
    next()
  }
}