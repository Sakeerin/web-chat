import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Log security-relevant events
    this.logSecurityEvent(request);

    return next.handle().pipe(
      map(data => this.sanitizeResponse(data)),
      tap(() => {
        // Add security headers to response
        this.addSecurityHeaders(response);
      }),
    );
  }

  private logSecurityEvent(request: Request): void {
    const securityEvents = [
      '/auth/login',
      '/auth/register',
      '/auth/reset-password',
      '/admin',
    ];

    const shouldLog = securityEvents.some(event => request.path.includes(event));
    
    if (shouldLog) {
      this.logger.log({
        event: 'security_event',
        method: request.method,
        path: request.path,
        ip: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
    }

    // Log suspicious patterns
    this.detectSuspiciousActivity(request);
  }

  private detectSuspiciousActivity(request: Request): void {
    const suspiciousPatterns = [
      /\.\.\//g, // Directory traversal
      /<script/gi, // XSS attempts
      /union\s+select/gi, // SQL injection
      /javascript:/gi, // JavaScript protocol
      /vbscript:/gi, // VBScript protocol
      /data:text\/html/gi, // Data URI XSS
      /eval\s*\(/gi, // Code injection
      /expression\s*\(/gi, // CSS expression injection
    ];

    const requestString = JSON.stringify({
      url: request.url,
      body: request.body,
      query: request.query,
      headers: request.headers,
    });

    const detectedPatterns = suspiciousPatterns.filter(pattern => 
      pattern.test(requestString)
    );

    if (detectedPatterns.length > 0) {
      this.logger.warn({
        event: 'suspicious_activity',
        patterns: detectedPatterns.map(p => p.toString()),
        method: request.method,
        path: request.path,
        ip: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
    }
  }

  private sanitizeResponse(data: any): any {
    if (!data) return data;

    // Don't sanitize certain response types
    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
      return data;
    }

    return this.deepSanitize(data);
  }

  private deepSanitize(obj: any): any {
    if (typeof obj === 'string') {
      // Sanitize HTML content in string responses
      return DOMPurify.sanitize(obj, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre'],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Don't sanitize certain fields that might contain intentional HTML
        const skipSanitization = [
          'password',
          'token',
          'signature',
          'hash',
          'encrypted',
        ].some(field => key.toLowerCase().includes(field));

        if (skipSanitization) {
          sanitized[key] = value;
        } else {
          sanitized[key] = this.deepSanitize(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  private addSecurityHeaders(response: Response): void {
    // Remove server information
    response.removeHeader('X-Powered-By');
    
    // Add security headers if not already present
    if (!response.getHeader('X-Content-Type-Options')) {
      response.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    if (!response.getHeader('X-Frame-Options')) {
      response.setHeader('X-Frame-Options', 'DENY');
    }
    
    if (!response.getHeader('X-XSS-Protection')) {
      response.setHeader('X-XSS-Protection', '1; mode=block');
    }
    
    if (!response.getHeader('Referrer-Policy')) {
      response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Add cache control for sensitive endpoints
    if (this.isSensitiveEndpoint(response.req as Request)) {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
    }
  }

  private isSensitiveEndpoint(request: Request): boolean {
    const sensitivePatterns = [
      '/auth/',
      '/admin/',
      '/user/',
      '/profile/',
      '/settings/',
    ];

    return sensitivePatterns.some(pattern => request.path.includes(pattern));
  }

  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }
}