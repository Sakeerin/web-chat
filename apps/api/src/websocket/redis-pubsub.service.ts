import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'
import { WebSocketGateway } from './websocket.gateway'

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name)
  private subClient: Redis
  private pubClient: Redis

  constructor() {
    this.subClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    })

    this.pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    })
  }

  async onModuleInit() {
    await this.setupSubscriptions()
    this.logger.log('Redis Pub/Sub service initialized')
  }

  async onModuleDestroy() {
    await this.subClient.quit()
    await this.pubClient.quit()
    this.logger.log('Redis Pub/Sub service destroyed')
  }

  private async setupSubscriptions() {
    // Subscribe to all WebSocket-related channels
    await this.subClient.subscribe(
      'message:new',
      'message:edited', 
      'message:deleted',
      'message:receipt',
      'presence:update',
      'typing:start',
      'typing:stop'
    )

    this.subClient.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message)
    })

    this.subClient.on('error', (error) => {
      this.logger.error(`Redis subscription error: ${error.message}`)
    })

    this.subClient.on('connect', () => {
      this.logger.log('Connected to Redis for subscriptions')
    })
  }

  private handleRedisMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message)
      
      switch (channel) {
        case 'message:new':
          this.handleNewMessage(data)
          break
        case 'message:edited':
          this.handleMessageEdited(data)
          break
        case 'message:deleted':
          this.handleMessageDeleted(data)
          break
        case 'message:receipt':
          this.handleMessageReceipt(data)
          break
        case 'presence:update':
          this.handlePresenceUpdate(data)
          break
        case 'typing:start':
          this.handleTypingStart(data)
          break
        case 'typing:stop':
          this.handleTypingStop(data)
          break
        default:
          this.logger.warn(`Unknown Redis channel: ${channel}`)
      }
    } catch (error) {
      this.logger.error(`Failed to handle Redis message: ${error.message}`)
    }
  }

  private handleNewMessage(data: any) {
    // This will be handled by WebSocketService directly
    // The gateway will broadcast to the appropriate room
  }

  private handleMessageEdited(data: any) {
    // This will be handled by WebSocketService directly
  }

  private handleMessageDeleted(data: any) {
    // This will be handled by WebSocketService directly
  }

  private handleMessageReceipt(data: any) {
    // This will be handled by WebSocketService directly
  }

  private handlePresenceUpdate(data: any) {
    // Broadcast presence update to all connected clients
    // In a real implementation, you'd want to be more selective about who receives these updates
    this.logger.log(`Presence update: User ${data.userId} is now ${data.status}`)
  }

  private handleTypingStart(data: any) {
    this.logger.log(`User ${data.userId} started typing in conversation ${data.conversationId}`)
  }

  private handleTypingStop(data: any) {
    this.logger.log(`User ${data.userId} stopped typing in conversation ${data.conversationId}`)
  }

  // Public methods for publishing events
  async publishMessage(channel: string, data: any) {
    try {
      await this.pubClient.publish(channel, JSON.stringify(data))
    } catch (error) {
      this.logger.error(`Failed to publish to ${channel}: ${error.message}`)
    }
  }

  async publishNewMessage(conversationId: string, message: any) {
    await this.publishMessage('message:new', { conversationId, message })
  }

  async publishMessageEdited(conversationId: string, message: any) {
    await this.publishMessage('message:edited', { conversationId, message })
  }

  async publishMessageDeleted(conversationId: string, messageId: string) {
    await this.publishMessage('message:deleted', { conversationId, messageId })
  }

  async publishMessageReceipt(conversationId: string, messageId: string, userId: string, type: string) {
    await this.publishMessage('message:receipt', { conversationId, messageId, userId, type })
  }

  async publishPresenceUpdate(userId: string, status: string, lastSeenAt: Date) {
    await this.publishMessage('presence:update', { userId, status, lastSeenAt })
  }

  async publishTypingStart(userId: string, conversationId: string, username: string) {
    await this.publishMessage('typing:start', { userId, conversationId, username })
  }

  async publishTypingStop(userId: string, conversationId: string, username: string) {
    await this.publishMessage('typing:stop', { userId, conversationId, username })
  }
}