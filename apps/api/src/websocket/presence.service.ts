import { Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'
import { PresenceStatus, PresenceData, AuthenticatedSocket } from './interfaces/websocket.interface'

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name)
  private redis: Redis
  private pubClient: Redis

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

  async setUserPresence(userId: string, socketId: string, status: PresenceStatus) {
    try {
      const presenceKey = `presence:${userId}`
      const now = new Date()

      // Get current presence data
      const currentData = await this.redis.get(presenceKey)
      let presenceData: PresenceData

      if (currentData) {
        presenceData = JSON.parse(currentData)
        // Add socket ID if not already present
        if (!presenceData.socketIds.includes(socketId)) {
          presenceData.socketIds.push(socketId)
        }
      } else {
        presenceData = {
          userId,
          status,
          lastSeenAt: now,
          socketIds: [socketId]
        }
      }

      // Update status and timestamp
      presenceData.status = status
      presenceData.lastSeenAt = now

      // Store in Redis with TTL
      await this.redis.setex(presenceKey, 3600, JSON.stringify(presenceData)) // 1 hour TTL

      // Publish presence update for real-time broadcasting
      await this.pubClient.publish('presence:update', JSON.stringify({
        userId,
        status,
        lastSeenAt: now
      }))

      this.logger.log(`Updated presence for user ${userId}: ${status}`)
    } catch (error) {
      this.logger.error(`Failed to set user presence: ${error.message}`)
    }
  }

  async removeUserSocket(userId: string, socketId: string) {
    try {
      const presenceKey = `presence:${userId}`
      const currentData = await this.redis.get(presenceKey)

      if (currentData) {
        const presenceData: PresenceData = JSON.parse(currentData)
        
        // Remove socket ID
        presenceData.socketIds = presenceData.socketIds.filter(id => id !== socketId)
        
        if (presenceData.socketIds.length === 0) {
          // No more sockets, set to offline
          presenceData.status = 'offline'
          presenceData.lastSeenAt = new Date()
          
          // Publish offline status
          await this.pubClient.publish('presence:update', JSON.stringify({
            userId,
            status: 'offline',
            lastSeenAt: presenceData.lastSeenAt
          }))
        }

        // Update or delete presence data
        if (presenceData.socketIds.length > 0) {
          await this.redis.setex(presenceKey, 3600, JSON.stringify(presenceData))
        } else {
          // Keep offline status for a while before removing completely
          await this.redis.setex(presenceKey, 300, JSON.stringify(presenceData)) // 5 minutes
        }
      }

      this.logger.log(`Removed socket ${socketId} for user ${userId}`)
    } catch (error) {
      this.logger.error(`Failed to remove user socket: ${error.message}`)
    }
  }

  async getUserPresence(userId: string): Promise<PresenceData | null> {
    try {
      const presenceKey = `presence:${userId}`
      const data = await this.redis.get(presenceKey)
      
      if (data) {
        return JSON.parse(data)
      }
      
      return null
    } catch (error) {
      this.logger.error(`Failed to get user presence: ${error.message}`)
      return null
    }
  }

  async getMultipleUserPresence(userIds: string[]): Promise<Record<string, PresenceData>> {
    try {
      const pipeline = this.redis.pipeline()
      
      userIds.forEach(userId => {
        pipeline.get(`presence:${userId}`)
      })
      
      const results = await pipeline.exec()
      const presenceMap: Record<string, PresenceData> = {}
      
      results?.forEach((result, index) => {
        const [error, data] = result
        if (!error && data) {
          try {
            presenceMap[userIds[index]] = JSON.parse(data as string)
          } catch (parseError) {
            this.logger.error(`Failed to parse presence data for user ${userIds[index]}`)
          }
        }
      })
      
      return presenceMap
    } catch (error) {
      this.logger.error(`Failed to get multiple user presence: ${error.message}`)
      return {}
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const presence = await this.getUserPresence(userId)
    return presence?.status === 'online' && presence.socketIds.length > 0
  }

  async getOnlineUsers(userIds: string[]): Promise<string[]> {
    const presenceMap = await this.getMultipleUserPresence(userIds)
    
    return userIds.filter(userId => {
      const presence = presenceMap[userId]
      return presence?.status === 'online' && presence.socketIds.length > 0
    })
  }

  async setUserAway(userId: string) {
    const presence = await this.getUserPresence(userId)
    if (presence && presence.status === 'online') {
      await this.setUserPresence(userId, '', 'away')
    }
  }

  async heartbeat(socket: AuthenticatedSocket) {
    // Update last seen timestamp
    await this.setUserPresence(socket.userId, socket.id, 'online')
  }

  async cleanup() {
    await this.redis.quit()
    await this.pubClient.quit()
  }
}