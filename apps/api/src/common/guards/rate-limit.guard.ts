import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

export interface RateLimitOptions {
  requests: number;
  window: string; // e.g., '1m', '1h', '1d'
  blockDuration?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const RateLimit = (options: RateLimitOptions) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('rate-limit', options, descriptor.value);
    } else {
      Reflect.defineMetadata('rate-limit', options, target);
    }
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly defaultLimits: Record<string, RateLimitOptions> = {
    login: { requests: 5, window: '15m', blockDuration: '1h' },
    register: { requests: 3, window: '1h', blockDuration: '24h' },
    messagesSend: { requests: 100, window: '1m' },
    fileUpload: { requests: 10, window: '1m' },
    apiCalls: { requests: 1000, window: '1h' },
    passwordReset: { requests: 3, window: '1h', blockDuration: '24h' },
    contactRequest: { requests: 20, window: '1h' },
    searchQuery: { requests: 100, window: '1m' },
  };

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get rate limit configuration
    const rateLimitOptions = 
      this.reflector.get<RateLimitOptions>('rate-limit', handler) ||
      this.reflector.get<RateLimitOptions>('rate-limit', controller) ||
      this.getDefaultLimit(request);

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const key = this.generateKey(request, rateLimitOptions);
    const windowMs = this.parseTimeWindow(rateLimitOptions.window);
    const blockDurationMs = rateLimitOptions.blockDuration 
      ? this.parseTimeWindow(rateLimitOptions.blockDuration)
      : windowMs;

    // Check if IP is currently blocked
    const blockKey = `${key}:blocked`;
    const isBlocked = await this.redis.get(blockKey);
    
    if (isBlocked) {
      throw new HttpException({
        error: 'Rate limit exceeded. Access temporarily blocked.',
        code: 'RATE_LIMIT_BLOCKED',
        retryAfter: Math.ceil(blockDurationMs / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Get current request count
    const current = await this.redis.get(key);
    const requestCount = current ? parseInt(current) : 0;

    if (requestCount >= rateLimitOptions.requests) {
      // Block the IP for the specified duration
      if (rateLimitOptions.blockDuration) {
        await this.redis.setex(blockKey, Math.ceil(blockDurationMs / 1000), '1');
      }

      throw new HttpException({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        limit: rateLimitOptions.requests,
        window: rateLimitOptions.window,
        retryAfter: Math.ceil(windowMs / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Increment counter
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    await pipeline.exec();

    // Add rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.requests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitOptions.requests - requestCount - 1));
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

    return true;
  }

  private generateKey(request: Request, options: RateLimitOptions): string {
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id || 'anonymous';
    const endpoint = `${request.method}:${request.route?.path || request.path}`;
    
    return `rate_limit:${ip}:${userId}:${endpoint}`;
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

  private parseTimeWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time window format: ${window}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  private getDefaultLimit(request: Request): RateLimitOptions | null {
    const path = request.path;
    const method = request.method;

    // Map common endpoints to default limits
    if (path.includes('/auth/login')) return this.defaultLimits.login;
    if (path.includes('/auth/register')) return this.defaultLimits.register;
    if (path.includes('/messages') && method === 'POST') return this.defaultLimits.messagesSend;
    if (path.includes('/upload')) return this.defaultLimits.fileUpload;
    if (path.includes('/auth/reset-password')) return this.defaultLimits.passwordReset;
    if (path.includes('/contacts') && method === 'POST') return this.defaultLimits.contactRequest;
    if (path.includes('/search')) return this.defaultLimits.searchQuery;

    // Default API rate limit
    return this.defaultLimits.apiCalls;
  }
}