import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private helmetMiddleware: any;
  private rateLimitMiddleware: any;

  constructor(private configService: ConfigService) {
    this.setupHelmet();
    this.setupRateLimit();
  }

  private setupHelmet() {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    
    this.helmetMiddleware = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          scriptSrc: isDevelopment 
            ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"] 
            : ["'self'"],
          connectSrc: ["'self'", "wss:", "ws:"],
          mediaSrc: ["'self'", "blob:", "data:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: !isDevelopment ? [] : undefined,
        },
      },
      crossOriginEmbedderPolicy: false, // Needed for some WebSocket implementations
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });
  }

  private setupRateLimit() {
    this.rateLimitMiddleware = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/metrics';
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Apply helmet security headers
    this.helmetMiddleware(req, res, (err: any) => {
      if (err) return next(err);
      
      // Apply rate limiting
      this.rateLimitMiddleware(req, res, (err: any) => {
        if (err) return next(err);
        
        // Add additional security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        
        next();
      });
    });
  }
}