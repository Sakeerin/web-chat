import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Logger, UseGuards, UnauthorizedException, Inject, forwardRef } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { WebSocketService } from './websocket.service'
import { PresenceService } from './presence.service'
import { TypingService } from './typing.service'
import { MessageDeliveryService } from '../messages/delivery/message-delivery.service'
import { 
  AuthenticatedSocket, 
  MessageInput, 
  ClientEvents, 
  ServerEvents,
  PresenceStatus 
} from './interfaces/websocket.interface'

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server<ClientEvents, ServerEvents>

  private readonly logger = new Logger(WebSocketGateway.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly webSocketService: WebSocketService,
    private readonly presenceService: PresenceService,
    private readonly typingService: TypingService,
    @Inject(forwardRef(() => MessageDeliveryService))
    private readonly messageDeliveryService: MessageDeliveryService,
  ) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server)
    this.logger.log('🔌 WebSocket Gateway initialized')
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client attempting to connect: ${client.id}`)
      
      // Wait for authentication - client must send 'auth' event with token
      // Set authTimeout for connection management
      const authTimeout = setTimeout(() => {
        this.logger.warn(`Client ${client.id} failed to authenticate within timeout`)
        client.emit('error', { code: 'AUTH_TIMEOUT', message: 'Authentication timeout' })
        client.disconnect()
      }, 10000) // 10 second timeout

      client.data.authTimeout = authTimeout
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`)
      client.disconnect()
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      // Clear auth timeout if still pending using clearTimeout
      if (client.data.authTimeout) {
        clearTimeout(client.data.authTimeout)
      }

      if (client.userId) {
        this.logger.log(`Client disconnected: ${client.id} (User: ${client.userId})`)
        
        // Leave all rooms
        await this.webSocketService.leaveAllRooms(client)
        
        // Remove from presence tracking
        await this.presenceService.removeUserSocket(client.userId, client.id)
        
        // Clear typing indicators
        await this.typingService.clearUserTyping(client)
        
        // Remove socket from user tracking
        await this.webSocketService.removeUserSocket(client.userId, client.id)
      } else {
        this.logger.log(`Unauthenticated client disconnected: ${client.id}`)
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`)
    }
  }

  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() token: string,
  ) {
    try {
      // Clear auth timeout using clearTimeout
      if (client.data.authTimeout) {
        clearTimeout(client.data.authTimeout)
        delete client.data.authTimeout
      }

      if (!token) {
        throw new UnauthorizedException('Token is required')
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token)
      
      if (!payload.sub || !payload.username) {
        throw new UnauthorizedException('Invalid token payload')
      }

      // Enhance socket with user data
      const authenticatedClient = client as AuthenticatedSocket
      authenticatedClient.userId = payload.sub
      authenticatedClient.user = {
        id: payload.sub,
        username: payload.username,
        name: payload.name || payload.username,
      }

      // Add to user socket tracking
      await this.webSocketService.addUserSocket(payload.sub, client.id)
      
      // Set user as online
      await this.presenceService.setUserPresence(payload.sub, client.id, 'online')

      // Process offline messages
      await this.messageDeliveryService.processOfflineMessages(payload.sub)

      this.logger.log(`Client authenticated: ${client.id} (User: ${payload.username})`)
      
      // Send authentication success
      client.emit('auth-success', { userId: payload.sub })
      
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}: ${error.message}`)
      client.emit('error', { code: 'AUTH_FAILED', message: 'Authentication failed' })
      client.disconnect()
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    if (!this.isAuthenticated(client)) return

    try {
      // Join the Socket.IO room using socket.join
      await client.join(`conversation:${conversationId}`)
      await this.webSocketService.joinRoom(client, conversationId)
      client.emit('room-joined', { conversationId })
      this.logger.log(`User ${client.userId} joined room ${conversationId}`)
    } catch (error) {
      this.logger.error(`Failed to join room: ${error.message}`)
      client.emit('error', { code: 'JOIN_ROOM_FAILED', message: 'Failed to join room' })
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    if (!this.isAuthenticated(client)) return

    try {
      // Leave the Socket.IO room using socket.leave
      await client.leave(`conversation:${conversationId}`)
      await this.webSocketService.leaveRoom(client, conversationId)
      client.emit('room-left', { conversationId })
      this.logger.log(`User ${client.userId} left room ${conversationId}`)
    } catch (error) {
      this.logger.error(`Failed to leave room: ${error.message}`)
    }
  }

  @SubscribeMessage('typing-start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    if (!this.isAuthenticated(client)) return

    try {
      await this.typingService.startTyping(client, conversationId)
      
      // Broadcast to other users in the conversation
      client.to(`conversation:${conversationId}`).emit('typing', client.userId, conversationId)
    } catch (error) {
      this.logger.error(`Failed to start typing: ${error.message}`)
    }
  }

  @SubscribeMessage('typing-stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    if (!this.isAuthenticated(client)) return

    try {
      await this.typingService.stopTyping(client, conversationId)
      
      // Broadcast to other users in the conversation
      client.to(`conversation:${conversationId}`).emit('typing-stop', client.userId, conversationId)
    } catch (error) {
      this.logger.error(`Failed to stop typing: ${error.message}`)
    }
  }

  @SubscribeMessage('presence-update')
  async handlePresenceUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() status: PresenceStatus,
  ) {
    if (!this.isAuthenticated(client)) return

    try {
      await this.presenceService.setUserPresence(client.userId, client.id, status)
      
      // Broadcast presence update to contacts/conversations
      // This would typically involve getting user's contacts and broadcasting to them
      this.server.emit('presence', client.userId, status)
    } catch (error) {
      this.logger.error(`Failed to update presence: ${error.message}`)
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!this.isAuthenticated(client)) return

    try {
      await this.presenceService.heartbeat(client)
      client.emit('heartbeat-ack')
    } catch (error) {
      this.logger.error(`Heartbeat failed: ${error.message}`)
    }
  }

  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    if (!this.isAuthenticated(client)) return

    try {
      await this.messageDeliveryService.markMessageAsRead(
        data.messageId,
        client.userId,
        data.conversationId,
      )
      client.emit('read-ack', { messageId: data.messageId })
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${error.message}`)
      client.emit('error', { code: 'MARK_READ_FAILED', message: 'Failed to mark message as read' })
    }
  }

  @SubscribeMessage('request-backfill')
  async handleRequestBackfill(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; lastMessageId?: string },
  ) {
    if (!this.isAuthenticated(client)) return

    try {
      const messages = await this.messageDeliveryService.backfillMessages(
        client.userId,
        data.conversationId,
        data.lastMessageId,
      )
      
      client.emit('backfill-messages', {
        conversationId: data.conversationId,
        messages,
      })
    } catch (error) {
      this.logger.error(`Failed to handle backfill request: ${error.message}`)
      client.emit('error', { code: 'BACKFILL_FAILED', message: 'Failed to backfill messages' })
    }
  }

  @SubscribeMessage('get-online-users')
  async handleGetOnlineUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    if (!this.isAuthenticated(client)) return

    try {
      const onlineUsers = await this.webSocketService.getOnlineUsersInConversation(conversationId)
      client.emit('online-users', { conversationId, users: onlineUsers })
    } catch (error) {
      this.logger.error(`Failed to get online users: ${error.message}`)
    }
  }

  private isAuthenticated(client: AuthenticatedSocket): boolean {
    if (!client.userId) {
      client.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Authentication required' })
      return false
    }
    return true
  }

  // Method to be called by message service when a new message is created
  async broadcastNewMessage(message: any) {
    await this.webSocketService.broadcastNewMessage(message)
  }

  // Method to be called by message service when a message is edited
  async broadcastMessageEdited(message: any) {
    await this.webSocketService.broadcastMessageEdited(message)
  }

  // Method to be called by message service when a message is deleted
  async broadcastMessageDeleted(conversationId: string, messageId: string) {
    await this.webSocketService.broadcastMessageDeleted(conversationId, messageId)
  }

  // Method to send message acknowledgment
  async sendMessageAck(userId: string, tempId: string, messageId: string) {
    const socketIds = await this.webSocketService.getUserSocketIds(userId)
    
    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket
      if (socket) {
        await this.webSocketService.sendMessageAck(socket, tempId, messageId)
      }
    }
  }

  // Method to broadcast to conversation room
  broadcastToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data)
  }

  // Method to broadcast message-new event
  async handleMessageNew(conversationId: string, message: any) {
    this.broadcastToConversation(conversationId, 'message-new', message)
  }

  // Method to broadcast message-edited event
  async handleMessageEdited(conversationId: string, message: any) {
    this.broadcastToConversation(conversationId, 'message-edited', message)
  }

  // Method to broadcast message-deleted event
  async handleMessageDeleted(conversationId: string, messageId: string) {
    this.broadcastToConversation(conversationId, 'message-deleted', messageId)
  }

  // Method to broadcast receipt event
  async handleReceipt(conversationId: string, messageId: string, userId: string, type: 'delivered' | 'seen') {
    this.broadcastToConversation(conversationId, 'receipt', { messageId, userId, type })
  }
}