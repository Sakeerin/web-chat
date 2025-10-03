import { Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'
import { TypingData, AuthenticatedSocket } from './interfaces/websocket.interface'

@Injectable()
export class TypingService {
  private readonly logger = new Logger(TypingService.name)
  private redis: Redis
  private pubClient: Redis
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    })

    this.pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    })
  }

  async startTyping(socket: AuthenticatedSocket, conversationId: string) {
    try {
      const typingKey = `typing:${conversationId}:${socket.userId}`
      const timeoutKey = `${conversationId}:${socket.userId}`
      
      // Clear existing timeout
      const existingTimeout = this.typingTimeouts.get(timeoutKey)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Set typing status in Redis
      const typingData: TypingData = {
        userId: socket.userId,
        conversationId,
        isTyping: true,
        lastTypingAt: new Date()
      }

      await this.redis.setex(typingKey, 10, JSON.stringify(typingData)) // 10 seconds TTL

      // Publish typing event
      await this.pubClient.publish('typing:start', JSON.stringify({
        userId: socket.userId,
        conversationId,
        username: socket.user.username
      }))

      // Set auto-stop timeout (5 seconds of inactivity)
      const timeout = setTimeout(() => {
        this.stopTyping(socket, conversationId)
        this.typingTimeouts.delete(timeoutKey)
      }, 5000)

      this.typingTimeouts.set(timeoutKey, timeout)

      this.logger.log(`User ${socket.userId} started typing in conversation ${conversationId}`)
    } catch (error) {
      this.logger.error(`Failed to start typing: ${error.message}`)
    }
  }

  async stopTyping(socket: AuthenticatedSocket, conversationId: string) {
    try {
      const typingKey = `typing:${conversationId}:${socket.userId}`
      const timeoutKey = `${conversationId}:${socket.userId}`
      
      // Clear timeout
      const existingTimeout = this.typingTimeouts.get(timeoutKey)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        this.typingTimeouts.delete(timeoutKey)
      }

      // Remove typing status from Redis
      await this.redis.del(typingKey)

      // Publish stop typing event
      await this.pubClient.publish('typing:stop', JSON.stringify({
        userId: socket.userId,
        conversationId,
        username: socket.user.username
      }))

      this.logger.log(`User ${socket.userId} stopped typing in conversation ${conversationId}`)
    } catch (error) {
      this.logger.error(`Failed to stop typing: ${error.message}`)
    }
  }

  async getTypingUsers(conversationId: string): Promise<TypingData[]> {
    try {
      const pattern = `typing:${conversationId}:*`
      const keys = await this.redis.keys(pattern)
      
      if (keys.length === 0) {
        return []
      }

      const pipeline = this.redis.pipeline()
      keys.forEach(key => pipeline.get(key))
      
      const results = await pipeline.exec()
      const typingUsers: TypingData[] = []

      results?.forEach((result) => {
        const [error, data] = result
        if (!error && data) {
          try {
            const typingData = JSON.parse(data as string)
            typingUsers.push(typingData)
          } catch (parseError) {
            this.logger.error(`Failed to parse typing data: ${parseError.message}`)
          }
        }
      })

      return typingUsers
    } catch (error) {
      this.logger.error(`Failed to get typing users: ${error.message}`)
      return []
    }
  }

  async isUserTyping(userId: string, conversationId: string): Promise<boolean> {
    try {
      const typingKey = `typing:${conversationId}:${userId}`
      const data = await this.redis.get(typingKey)
      return data !== null
    } catch (error) {
      this.logger.error(`Failed to check if user is typing: ${error.message}`)
      return false
    }
  }

  async clearUserTyping(socket: AuthenticatedSocket) {
    try {
      // Get all conversations the user might be typing in
      const pattern = `typing:*:${socket.userId}`
      const keys = await this.redis.keys(pattern)
      
      if (keys.length > 0) {
        // Clear all typing statuses for this user
        await this.redis.del(...keys)
        
        // Extract conversation IDs and publish stop events
        for (const key of keys) {
          const parts = key.split(':')
          if (parts.length >= 3) {
            const conversationId = parts[1]
            await this.pubClient.publish('typing:stop', JSON.stringify({
              userId: socket.userId,
              conversationId,
              username: socket.user.username
            }))
          }
        }
      }

      // Clear all timeouts for this user
      const timeoutKeys = Array.from(this.typingTimeouts.keys()).filter(key => 
        key.endsWith(`:${socket.userId}`)
      )
      
      timeoutKeys.forEach(key => {
        const timeout = this.typingTimeouts.get(key)
        if (timeout) {
          clearTimeout(timeout)
          this.typingTimeouts.delete(key)
        }
      })

      this.logger.log(`Cleared all typing statuses for user ${socket.userId}`)
    } catch (error) {
      this.logger.error(`Failed to clear user typing: ${error.message}`)
    }
  }

  async cleanup() {
    // Clear all timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout))
    this.typingTimeouts.clear()
    
    await this.redis.quit()
    await this.pubClient.quit()
  }
}