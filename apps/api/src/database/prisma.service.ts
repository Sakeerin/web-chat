import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  /**
   * Clean disconnect for graceful shutdown
   */
  async enableShutdownHooks(app: any) {
    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await app.close()
    })
  }

  /**
   * Health check for database connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const [userCount, conversationCount, messageCount] = await Promise.all([
      this.user.count(),
      this.conversation.count(),
      this.message.count(),
    ])

    return {
      users: userCount,
      conversations: conversationCount,
      messages: messageCount,
      timestamp: new Date().toISOString(),
    }
  }
}