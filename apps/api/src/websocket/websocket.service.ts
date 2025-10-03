import { Injectable, Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import Redis from 'ioredis'
import { 
  AuthenticatedSocket, 
  Message, 
  PresenceStatus, 
  ReceiptType 
} from './interfaces/websocket.interface'

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name)
  private server: Server
  private redis: Redis
  private pubClient: Redis
  private subClient: Redis

  constructor() {
    // Initialize Redis clients for pub/sub
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    })

    this.pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    })

    this.subClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    })

    this.setupRedisSubscriptions()
  }

  setServer(server: Server) {
    this.server = server
  }

  private setupRedisSubscriptions() {
    // Subscribe to message events
    this.subClient.subscribe('message:new', 'message:edited', 'message:deleted', 'message:receipt')
    
    this.subClient.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message)
        this.handleRedisMessage(channel, data)
      } catch (error) {
        this.logger.error(`Failed to parse Redis message: ${error.message}`)
      }
    })
  }

  private handleRedisMessage(channel: string, data: any) {
    switch (channel) {
      case 'message:new':
        this.broadcastToConversation(data.conversationId, 'message-new', data.message)
        break
      case 'message:edited':
        this.broadcastToConversation(data.conversationId, 'message-edited', data.message)
        break
      case 'message:deleted':
        this.broadcastToConversation(data.conversationId, 'message-deleted', data.messageId)
        break
      case 'message:receipt':
        this.broadcastToConversation(data.conversationId, 'receipt', {
          messageId: data.messageId,
          userId: data.userId,
          type: data.type
        })
        break
    }
  }

  async joinRoom(socket: AuthenticatedSocket, conversationId: string) {
    try {
      await socket.join(`conversation:${conversationId}`)
      
      // Store user's room membership in Redis
      await this.redis.sadd(`user:${socket.userId}:rooms`, conversationId)
      await this.redis.sadd(`room:${conversationId}:users`, socket.userId)
      
      this.logger.log(`User ${socket.userId} joined conversation ${conversationId}`)
    } catch (error) {
      this.logger.error(`Failed to join room: ${error.message}`)
      socket.emit('error', { code: 'JOIN_ROOM_FAILED', message: 'Failed to join conversation' })
    }
  }

  async leaveRoom(socket: AuthenticatedSocket, conversationId: string) {
    try {
      await socket.leave(`conversation:${conversationId}`)
      
      // Remove user's room membership from Redis
      await this.redis.srem(`user:${socket.userId}:rooms`, conversationId)
      await this.redis.srem(`room:${conversationId}:users`, socket.userId)
      
      this.logger.log(`User ${socket.userId} left conversation ${conversationId}`)
    } catch (error) {
      this.logger.error(`Failed to leave room: ${error.message}`)
    }
  }

  async leaveAllRooms(socket: AuthenticatedSocket) {
    try {
      const rooms = await this.redis.smembers(`user:${socket.userId}:rooms`)
      
      for (const conversationId of rooms) {
        await socket.leave(`conversation:${conversationId}`)
        await this.redis.srem(`room:${conversationId}:users`, socket.userId)
      }
      
      await this.redis.del(`user:${socket.userId}:rooms`)
      
      this.logger.log(`User ${socket.userId} left all rooms`)
    } catch (error) {
      this.logger.error(`Failed to leave all rooms: ${error.message}`)
    }
  }

  broadcastToConversation(conversationId: string, event: string, data: any) {
    if (!this.server) {
      this.logger.warn('Server not initialized, cannot broadcast message')
      return
    }

    this.server.to(`conversation:${conversationId}`).emit(event, data)
  }

  async broadcastNewMessage(message: Message) {
    // Publish to Redis for horizontal scaling
    await this.pubClient.publish('message:new', JSON.stringify({
      conversationId: message.conversationId,
      message
    }))
  }

  async broadcastMessageEdited(message: Message) {
    await this.pubClient.publish('message:edited', JSON.stringify({
      conversationId: message.conversationId,
      message
    }))
  }

  async broadcastMessageDeleted(conversationId: string, messageId: string) {
    await this.pubClient.publish('message:deleted', JSON.stringify({
      conversationId,
      messageId
    }))
  }

  async broadcastMessageReceipt(conversationId: string, messageId: string, userId: string, type: ReceiptType) {
    await this.pubClient.publish('message:receipt', JSON.stringify({
      conversationId,
      messageId,
      userId,
      type
    }))
  }

  async sendMessageAck(socket: AuthenticatedSocket, tempId: string, messageId: string) {
    socket.emit('message-ack', tempId, messageId)
  }

  async sendMessageAckToSocket(socketId: string, tempId: string, messageId: string) {
    if (this.server) {
      this.server.to(socketId).emit('message-ack', tempId, messageId)
    }
  }

  async broadcastToUser(userId: string, event: string, data: any) {
    if (!this.server) {
      this.logger.warn('Server not initialized, cannot broadcast to user')
      return
    }

    const socketIds = await this.getUserSocketIds(userId)
    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, data)
    }
  }

  async getUserSocketIds(userId: string): Promise<string[]> {
    const socketIds = await this.redis.smembers(`user:${userId}:sockets`)
    return socketIds
  }

  async addUserSocket(userId: string, socketId: string) {
    await this.redis.sadd(`user:${userId}:sockets`, socketId)
    await this.redis.expire(`user:${userId}:sockets`, 3600) // 1 hour TTL
  }

  // Support for authTimeout and clearTimeout in connection management
  setAuthTimeout(socketId: string, callback: () => void, delay: number): NodeJS.Timeout {
    return setTimeout(callback, delay)
  }

  clearAuthTimeout(timeout: NodeJS.Timeout) {
    clearTimeout(timeout)
  }

  async removeUserSocket(userId: string, socketId: string) {
    await this.redis.srem(`user:${userId}:sockets`, socketId)
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const socketCount = await this.redis.scard(`user:${userId}:sockets`)
    return socketCount > 0
  }

  async getOnlineUsersInConversation(conversationId: string): Promise<string[]> {
    const userIds = await this.redis.smembers(`room:${conversationId}:users`)
    const onlineUsers: string[] = []
    
    for (const userId of userIds) {
      const isOnline = await this.isUserOnline(userId)
      if (isOnline) {
        onlineUsers.push(userId)
      }
    }
    
    return onlineUsers
  }

  async cleanup() {
    await this.redis.quit()
    await this.pubClient.quit()
    await this.subClient.quit()
  }
}