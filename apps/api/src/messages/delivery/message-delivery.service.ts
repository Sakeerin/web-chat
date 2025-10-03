import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { WebSocketService } from '../../websocket/websocket.service'
import Redis from 'ioredis'
import { 
  MessageDeliveryState, 
  MessageWithDeliveryState, 
  OfflineMessage,
  DeliveryReceipt,
  MessageDeduplicationResult
} from './interfaces/delivery.interface'
import { MessageWithRelations } from '../interfaces/message.interface'
import { ReceiptType } from '@prisma/client'

@Injectable()
export class MessageDeliveryService {
  private readonly logger = new Logger(MessageDeliveryService.name)
  private readonly redis: Redis

  constructor(
    private readonly prisma: PrismaService,
    private readonly webSocketService: WebSocketService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    })
  }

  /**
   * Handle message delivery with deduplication and state tracking
   */
  async deliverMessage(
    message: MessageWithRelations,
    tempId: string,
    senderId: string,
  ): Promise<MessageDeliveryState> {
    try {
      // 1. Check for deduplication
      const deduplicationResult = await this.checkMessageDeduplication(tempId, senderId)
      if (deduplicationResult.isDuplicate) {
        this.logger.warn(`Duplicate message detected: tempId=${tempId}, existingId=${deduplicationResult.existingMessageId}`)
        return {
          messageId: deduplicationResult.existingMessageId!,
          state: 'sent',
          deliveredTo: [],
          readBy: [],
          timestamp: new Date(),
        }
      }

      // 2. Store deduplication mapping
      await this.storeDeduplicationMapping(tempId, message.id, senderId)

      // 3. Get conversation members (excluding sender)
      const members = await this.getConversationMembers(message.conversationId, senderId)

      // 4. Determine online and offline users
      const onlineUsers: string[] = []
      const offlineUsers: string[] = []

      for (const member of members) {
        const isOnline = await this.webSocketService.isUserOnline(member.userId)
        if (isOnline) {
          onlineUsers.push(member.userId)
        } else {
          offlineUsers.push(member.userId)
        }
      }

      // 5. Send to online users immediately
      const deliveredTo: string[] = []
      for (const userId of onlineUsers) {
        try {
          await this.deliverToOnlineUser(message, userId)
          deliveredTo.push(userId)
          
          // Create delivery receipt
          await this.createDeliveryReceipt(message.id, userId, 'DELIVERED')
        } catch (error) {
          this.logger.error(`Failed to deliver message to online user ${userId}: ${error.message}`)
          // If delivery fails, treat as offline
          offlineUsers.push(userId)
        }
      }

      // 6. Queue for offline users
      for (const userId of offlineUsers) {
        await this.queueMessageForOfflineUser(message, userId)
      }

      // 7. Send acknowledgment to sender
      const senderSocketIds = await this.webSocketService.getUserSocketIds(senderId)
      for (const socketId of senderSocketIds) {
        // Note: We'll need to modify WebSocketService to support socket ID-based emission
        await this.webSocketService.sendMessageAckToSocket(socketId, tempId, message.id)
      }

      return {
        messageId: message.id,
        state: 'sent',
        deliveredTo,
        readBy: [],
        timestamp: new Date(),
      }
    } catch (error) {
      this.logger.error(`Failed to deliver message: ${error.message}`)
      throw error
    }
  }

  /**
   * Check if message is a duplicate based on temporary ID
   */
  private async checkMessageDeduplication(
    tempId: string,
    senderId: string,
  ): Promise<MessageDeduplicationResult> {
    const key = `dedup:${senderId}:${tempId}`
    const existingMessageId = await this.redis.get(key)
    
    return {
      isDuplicate: !!existingMessageId,
      existingMessageId: existingMessageId || undefined,
    }
  }

  /**
   * Store deduplication mapping with TTL
   */
  private async storeDeduplicationMapping(
    tempId: string,
    messageId: string,
    senderId: string,
  ): Promise<void> {
    const key = `dedup:${senderId}:${tempId}`
    // Store for 1 hour to handle retries and reconnections
    await this.redis.setex(key, 3600, messageId)
  }

  /**
   * Get conversation members excluding sender
   */
  private async getConversationMembers(
    conversationId: string,
    excludeUserId: string,
  ): Promise<Array<{ userId: string }>> {
    return this.prisma.conversationMember.findMany({
      where: {
        conversationId,
        userId: { not: excludeUserId },
        isActive: true,
      },
      select: { userId: true },
    })
  }

  /**
   * Deliver message to online user via WebSocket
   */
  private async deliverToOnlineUser(
    message: MessageWithRelations,
    userId: string,
  ): Promise<void> {
    // Check privacy settings for read receipts
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { privacySettings: true },
    })

    const privacySettings = (user?.privacySettings as any) || {}
    const showReadReceipts = privacySettings.showReadReceipts !== false // Default to true

    const messageWithDeliveryState: MessageWithDeliveryState = {
      ...message,
      deliveryState: {
        messageId: message.id,
        state: 'delivered',
        deliveredTo: [userId],
        readBy: [],
        timestamp: new Date(),
      },
      showReadReceipts,
    }

    // Broadcast to user's sockets
    this.webSocketService.broadcastToUser(userId, 'message-new', messageWithDeliveryState)
  }

  /**
   * Queue message for offline user
   */
  private async queueMessageForOfflineUser(
    message: MessageWithRelations,
    userId: string,
  ): Promise<void> {
    const offlineMessage: OfflineMessage = {
      messageId: message.id,
      conversationId: message.conversationId,
      userId,
      message,
      queuedAt: new Date(),
    }

    const key = `offline:${userId}`
    await this.redis.lpush(key, JSON.stringify(offlineMessage))
    
    // Set TTL for offline queue (7 days)
    await this.redis.expire(key, 7 * 24 * 3600)
  }

  /**
   * Process offline message queue when user comes online
   */
  async processOfflineMessages(userId: string): Promise<void> {
    try {
      const key = `offline:${userId}`
      const messages = await this.redis.lrange(key, 0, -1)
      
      if (messages.length === 0) {
        return
      }

      this.logger.log(`Processing ${messages.length} offline messages for user ${userId}`)

      // Process messages in chronological order (oldest first)
      const offlineMessages: OfflineMessage[] = messages
        .reverse() // Redis LRANGE returns newest first, we want oldest first
        .map(msg => JSON.parse(msg))

      for (const offlineMessage of offlineMessages) {
        try {
          // Deliver the message
          await this.deliverToOnlineUser(offlineMessage.message, userId)
          
          // Create delivery receipt
          await this.createDeliveryReceipt(
            offlineMessage.messageId,
            userId,
            'DELIVERED',
          )

          // Broadcast delivery receipt to conversation
          await this.webSocketService.broadcastMessageReceipt(
            offlineMessage.conversationId,
            offlineMessage.messageId,
            userId,
            'delivered',
          )
        } catch (error) {
          this.logger.error(`Failed to process offline message ${offlineMessage.messageId}: ${error.message}`)
        }
      }

      // Clear the offline queue
      await this.redis.del(key)
    } catch (error) {
      this.logger.error(`Failed to process offline messages for user ${userId}: ${error.message}`)
    }
  }

  /**
   * Create delivery receipt in database
   */
  private async createDeliveryReceipt(
    messageId: string,
    userId: string,
    type: ReceiptType,
  ): Promise<void> {
    try {
      await this.prisma.messageReceipt.upsert({
        where: {
          messageId_userId_type: {
            messageId,
            userId,
            type,
          },
        },
        update: {
          timestamp: new Date(),
        },
        create: {
          messageId,
          userId,
          type,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      this.logger.error(`Failed to create delivery receipt: ${error.message}`)
    }
  }

  /**
   * Mark message as read and handle read receipts
   */
  async markMessageAsRead(
    messageId: string,
    userId: string,
    conversationId: string,
  ): Promise<void> {
    try {
      // Check if user has privacy setting to send read receipts
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { privacySettings: true },
      })

      const privacySettings = (user?.privacySettings as any) || {}
      const sendReadReceipts = privacySettings.sendReadReceipts !== false // Default to true

      if (sendReadReceipts) {
        // Create read receipt
        await this.createDeliveryReceipt(messageId, userId, 'READ')

        // Broadcast read receipt to conversation
        await this.webSocketService.broadcastMessageReceipt(
          conversationId,
          messageId,
          userId,
          'seen',
        )
      }

      // Update conversation member's last read message
      await this.prisma.conversationMember.updateMany({
        where: {
          conversationId,
          userId,
          isActive: true,
        },
        data: {
          lastReadMessageId: messageId,
          lastReadAt: new Date(),
        },
      })
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${error.message}`)
      throw error
    }
  }

  /**
   * Get delivery state for a message
   */
  async getMessageDeliveryState(
    messageId: string,
    requestingUserId: string,
  ): Promise<MessageDeliveryState> {
    // Verify user can access this message
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          members: {
            some: {
              userId: requestingUserId,
              isActive: true,
            },
          },
        },
      },
      include: {
        receipts: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                privacySettings: true,
              },
            },
          },
        },
      },
    })

    if (!message) {
      throw new Error('Message not found or access denied')
    }

    const deliveredTo: string[] = []
    const readBy: string[] = []

    for (const receipt of message.receipts) {
      const privacySettings = (receipt.user.privacySettings as any) || {}
      const showReadReceipts = privacySettings.showReadReceipts !== false

      if (receipt.type === 'DELIVERED') {
        deliveredTo.push(receipt.userId)
      } else if (receipt.type === 'READ' && showReadReceipts) {
        readBy.push(receipt.userId)
      }
    }

    return {
      messageId,
      state: readBy.length > 0 ? 'read' : deliveredTo.length > 0 ? 'delivered' : 'sent',
      deliveredTo,
      readBy,
      timestamp: message.createdAt,
    }
  }

  /**
   * Backfill messages for reconnected client
   */
  async backfillMessages(
    userId: string,
    conversationId: string,
    lastMessageId?: string,
  ): Promise<MessageWithDeliveryState[]> {
    try {
      // Get user's last read message if not provided
      if (!lastMessageId) {
        const member = await this.prisma.conversationMember.findFirst({
          where: {
            conversationId,
            userId,
            isActive: true,
          },
          select: { lastReadMessageId: true },
        })
        lastMessageId = member?.lastReadMessageId || undefined
      }

      // Build where clause for messages after last read
      const where: any = {
        conversationId,
        isDeleted: false,
      }

      if (lastMessageId) {
        where.id = { gt: lastMessageId }
      }

      // Get messages with delivery state
      const messages = await this.prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                },
              },
            },
          },
          attachments: true,
          receipts: {
            include: {
              user: {
                select: {
                  id: true,
                  privacySettings: true,
                },
              },
            },
          },
        },
        orderBy: { id: 'asc' }, // Chronological order for backfill
        take: 100, // Limit backfill to prevent overwhelming
      })

      // Add delivery state to each message
      const messagesWithDeliveryState: MessageWithDeliveryState[] = []

      for (const message of messages) {
        const deliveryState = await this.getMessageDeliveryState(message.id, userId)
        
        const messageWithDeliveryState: MessageWithDeliveryState = {
          ...(message as any),
          deliveryState,
          showReadReceipts: true, // Will be filtered per user in delivery state
        }
        messagesWithDeliveryState.push(messageWithDeliveryState)
      }

      return messagesWithDeliveryState
    } catch (error) {
      this.logger.error(`Failed to backfill messages: ${error.message}`)
      throw error
    }
  }

  /**
   * Clean up old deduplication entries
   */
  async cleanupDeduplicationEntries(): Promise<void> {
    // This would typically be called by a cron job
    // Redis TTL handles this automatically, but we could add manual cleanup if needed
    this.logger.log('Deduplication cleanup completed (handled by Redis TTL)')
  }

  async cleanup(): Promise<void> {
    await this.redis.quit()
  }
}