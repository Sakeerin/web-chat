import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import * as crypto from 'crypto'

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
    timestamp: string
    requestId: string
    path: string
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const requestId = crypto.randomUUID()

    let status: number
    let message: string
    let code: string
    let details: Record<string, any> | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any
        message = responseObj.message || exception.message
        details = responseObj.errors || responseObj.details
        code = this.getErrorCode(status, responseObj.error)
      } else {
        message = exceptionResponse as string
        code = this.getErrorCode(status)
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR
      message = 'Internal server error'
      code = 'INTERNAL_SERVER_ERROR'
      
      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
        `Request ID: ${requestId}`,
      )
    }

    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId,
        path: request.url,
      },
    }

    // Log error details for debugging
    this.logger.error(
      `HTTP ${status} Error: ${message}`,
      `Request ID: ${requestId}, Path: ${request.url}`,
    )

    response.status(status).json(errorResponse)
  }

  private getErrorCode(status: number, customCode?: string): string {
    if (customCode) return customCode

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST'
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED'
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN'
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND'
      case HttpStatus.CONFLICT:
        return 'CONFLICT'
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED'
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_SERVER_ERROR'
      case HttpStatus.BAD_GATEWAY:
        return 'BAD_GATEWAY'
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE'
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'GATEWAY_TIMEOUT'
      default:
        return 'UNKNOWN_ERROR'
    }
  }
}