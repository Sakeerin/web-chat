import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface RequestWithCsrf extends Request {
  csrfToken?: string;
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly csrfSecret: string;
  private readonly excludedPaths: string[] = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/health',
    '/metrics',
  ];

  constructor(private configService: ConfigService) {
    this.csrfSecret = this.configService.get('CSRF_SECRET') || 'default-csrf-secret';
  }

  use(req: RequestWithCsrf, res: Response, next: NextFunction) {
    // Skip CSRF for excluded paths and GET requests
    if (this.shouldSkipCsrf(req)) {
      return next();
    }

    // For state-changing operations, verify CSRF token
    if (this.isStateChangingRequest(req)) {
      const token = this.extractCsrfToken(req);
      
      if (!token || !this.validateCsrfToken(token, req)) {
        throw new UnauthorizedException('Invalid CSRF token');
      }
    }

    // Generate and attach CSRF token for responses
    const csrfToken = this.generateCsrfToken(req);
    req.csrfToken = csrfToken;
    res.setHeader('X-CSRF-Token', csrfToken);

    next();
  }

  private shouldSkipCsrf(req: RequestWithCsrf): boolean {
    // Skip for excluded paths
    if (this.excludedPaths.some(path => req.path.startsWith(path))) {
      return true;
    }

    // Skip for WebSocket upgrade requests
    if (req.headers.upgrade === 'websocket') {
      return true;
    }

    // Skip for API requests with JWT (stateless)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return true;
    }

    return false;
  }

  private isStateChangingRequest(req: Request): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  }

  private extractCsrfToken(req: Request): string | null {
    // Check header first
    let token = req.headers['x-csrf-token'] as string;
    
    // Check body if not in header
    if (!token && req.body && req.body._csrf) {
      token = req.body._csrf;
    }

    return token || null;
  }

  private generateCsrfToken(req: Request): string {
    const sessionId = this.getSessionId(req);
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    
    const payload = `${sessionId}:${timestamp}:${randomBytes}`;
    const signature = crypto
      .createHmac('sha256', this.csrfSecret)
      .update(payload)
      .digest('hex');

    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  private validateCsrfToken(token: string, req: Request): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts = decoded.split(':');
      
      if (parts.length !== 4) {
        return false;
      }

      const [sessionId, timestamp, randomBytes, signature] = parts;
      const payload = `${sessionId}:${timestamp}:${randomBytes}`;
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.csrfSecret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        return false;
      }

      // Verify session matches
      const currentSessionId = this.getSessionId(req);
      if (sessionId !== currentSessionId) {
        return false;
      }

      // Check token age (valid for 1 hour)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 3600000) { // 1 hour in milliseconds
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private getSessionId(req: Request): string {
    // Use session ID from cookie or generate from IP + User-Agent
    const sessionCookie = req.cookies?.sessionId;
    if (sessionCookie) {
      return sessionCookie;
    }

    // Fallback to IP + User-Agent hash for stateless scenarios
    const identifier = `${req.ip}:${req.headers['user-agent'] || ''}`;
    return crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 16);
  }
}