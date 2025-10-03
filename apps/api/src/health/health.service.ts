import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async check() {
    try {
      const startTime = Date.now();
      
      // Basic checks
      const dbStatus = await this.checkDatabase();
      const redisStatus = await this.checkRedis();
      
      const responseTime = Date.now() - startTime;
      
      const isHealthy = dbStatus.healthy && redisStatus.healthy;
      
      return {
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  async readiness() {
    try {
      const startTime = Date.now();
      
      // Check all critical dependencies
      const [dbStatus, redisStatus, externalServices] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkExternalServices(),
      ]);
      
      const responseTime = Date.now() - startTime;
      
      const isReady = 
        dbStatus.healthy && 
        redisStatus.healthy && 
        externalServices.healthy;
      
      if (!isReady) {
        throw new Error('Service not ready');
      }
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        responseTime,
        checks: {
          database: dbStatus,
          redis: redisStatus,
          external: externalServices,
        },
      };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      throw error;
    }
  }

  async liveness() {
    try {
      // Simple liveness check - just verify the service is running
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      };
    } catch (error) {
      this.logger.error('Liveness check failed', error);
      throw error;
    }
  }

  async detailed() {
    try {
      const startTime = Date.now();
      
      const [
        basicHealth,
        dbStatus,
        redisStatus,
        externalServices,
        systemInfo,
      ] = await Promise.all([
        this.check(),
        this.checkDatabase(),
        this.checkRedis(),
        this.checkExternalServices(),
        this.getSystemInfo(),
      ]);
      
      const responseTime = Date.now() - startTime;
      
      return {
        ...basicHealth,
        responseTime,
        checks: {
          database: dbStatus,
          redis: redisStatus,
          external: externalServices,
        },
        system: systemInfo,
      };
    } catch (error) {
      this.logger.error('Detailed health check failed', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkDatabase() {
    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime,
        status: 'connected',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        healthy: false,
        status: 'disconnected',
        error: error.message,
      };
    }
  }

  private async checkRedis() {
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime,
        status: 'connected',
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        healthy: false,
        status: 'disconnected',
        error: error.message,
      };
    }
  }

  private async checkExternalServices() {
    try {
      // Check MinIO, MeiliSearch, NATS, ClamAV
      const checks = await Promise.allSettled([
        this.checkMinIO(),
        this.checkMeiliSearch(),
        this.checkNATS(),
        this.checkClamAV(),
      ]);
      
      const results = checks.map((check, index) => {
        const services = ['minio', 'meilisearch', 'nats', 'clamav'];
        return {
          service: services[index],
          healthy: check.status === 'fulfilled',
          ...(check.status === 'fulfilled' ? check.value : { error: check.reason?.message }),
        };
      });
      
      const allHealthy = results.every(result => result.healthy);
      
      return {
        healthy: allHealthy,
        services: results,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  private async checkMinIO() {
    // Implement MinIO health check
    return { healthy: true, status: 'connected' };
  }

  private async checkMeiliSearch() {
    // Implement MeiliSearch health check
    return { healthy: true, status: 'connected' };
  }

  private async checkNATS() {
    // Implement NATS health check
    return { healthy: true, status: 'connected' };
  }

  private async checkClamAV() {
    // Implement ClamAV health check
    return { healthy: true, status: 'connected' };
  }

  private async getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      pid: process.pid,
    };
  }
}