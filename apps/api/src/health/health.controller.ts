import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    const isDbHealthy = await this.prisma.isHealthy()
    const stats = isDbHealthy ? await this.prisma.getStats() : null

    return {
      status: isDbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: isDbHealthy,
        stats,
      },
      version: process.env.npm_package_version || '1.0.0',
    }
  }

  @Get('db')
  async getDatabaseHealth() {
    const isHealthy = await this.prisma.isHealthy()
    
    if (!isHealthy) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
      }
    }

    const stats = await this.prisma.getStats()
    
    return {
      status: 'healthy',
      message: 'Database connection successful',
      stats,
      timestamp: new Date().toISOString(),
    }
  }
}