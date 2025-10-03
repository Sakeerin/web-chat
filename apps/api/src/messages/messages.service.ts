import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { ulid } from 'ulid'
import { 
  MessageWithRelations, 
  MessageListResponse, 
  CreateMessageInput, 
  UpdateMessageInput,
  MessageEditHistory,
  MessageSearchResult
} from './interfaces/message.interface'
import { CreateMessageDto } from './dto/create-message.dto'
import { UpdateMessageDto } from './dto/update-message.dto'
import { GetMessagesDto } from './dto/get-messages.dto'
import { Message, MessageType, Prisma } from '@prisma/client'
import { MessageSearchService, MessageSearchOptions } from './search/message-search.service'
import { MessageDeliveryService } from './delivery/message-delivery.service'
import { SearchService } from '../search/search.service'

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageSearchService: MessageSearchService,
    public readonly messageDeliveryService: MessageDeliveryService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Create a new message with ULID generation for time-ordered IDs and delivery tracking
   */
  async createMessageWithDelivery(
    input: CreateMessageInput,
    tempId: string,
  ): Promise<{ message: MessageWithRelations; deliveryState: any }> {
    const message = await this.createMessage(input)
    
    // Handle delivery through delivery service
    const deliveryState = await this.messageDeliveryService.deliverMessage(
      message,
      tempId,
      input.senderId,
    )

    return { message, deliveryState }
  }

  /**
   * Create a new message with ULID generation for time-ordered IDs
   */
  async createMessage(input: CreateMessageInput): Promise<MessageWithRelations> {
    // Verify conversation exists and user is a member
    const conversationMember = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId: input.conversationId,
        userId: input.senderId,
        isActive: true,
      },
    })

    if (!conversationMember) {
      throw new ForbiddenException('User is not a member of this conversation')
    }

    // Verify reply-to message exists if specified
    if (input.replyToId) {
      const replyToMessage = await this.prisma.message.findFirst({
        where: {
          id: input.replyToId,
          conversationId: input.conversationId,
          isDeleted: false,
        },
      })

      if (!replyToMessage) {
        throw new BadRequestException('Reply-to message not found or deleted')
      }
    }

    // Generate ULID for time-ordered message ID
    const messageId = ulid()

    const message = await this.prisma.message.create({
      data: {
        id: messageId,
        conversationId: input.conversationId,
        senderId: input.senderId,
        type: input.type,
        content: input.content,
        replyToId: input.replyToId,
        metadata: input.metadata || {},
      },
      include: this.getMessageInclude(),
    })

    // Update conversation's updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    })

    // Index message for search (async, don't wait)
    this.searchService.indexMessage(messageId).catch(error => {
      console.error(`Failed to index message ${messageId}:`, error)
    })

    return message as unknown as MessageWithRelations
  }

  /**
   * Get messages with cursor-based pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    params: GetMessagesDto,
  ): Promise<MessageListResponse> {
    // Verify user is a member of the conversation
    const conversationMember = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
    })

    if (!conversationMember) {
      throw new ForbiddenException('User is not a member of this conversation')
    }

    const { cursor, limit = 50, search } = params

    // Build where clause
    const where: Prisma.MessageWhereInput = {
      conversationId,
      isDeleted: false,
    }

    // Add cursor-based pagination
    if (cursor) {
      where.id = {
        lt: cursor, // Get messages before this cursor (older messages)
      }
    }

    // Add search functionality
    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive',
      }
    }

    // Get messages with one extra to check if there are more
    const messages = await this.prisma.message.findMany({
      where,
      include: this.getMessageInclude(),
      orderBy: { id: 'desc' }, // ULID is time-ordered, so this gives us chronological order
      take: limit + 1,
    })

    // Check if there are more messages
    const hasMore = messages.length > limit
    if (hasMore) {
      messages.pop() // Remove the extra message
    }

    // Get total count for the conversation (excluding deleted)
    const total = await this.prisma.message.count({
      where: {
        conversationId,
        isDeleted: false,
      },
    })

    // Get next cursor (last message ID)
    const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1].id : undefined

    return {
      messages: messages as unknown as MessageWithRelations[],
      nextCursor,
      hasMore,
      total,
    }
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string, userId: string): Promise<MessageWithRelations> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        isDeleted: false,
      },
      include: this.getMessageInclude(),
    })

    if (!message) {
      throw new NotFoundException('Message not found')
    }

    // Verify user is a member of the conversation
    const conversationMember = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId: message.conversationId,
        userId,
        isActive: true,
      },
    })

    if (!conversationMember) {
      throw new ForbiddenException('User is not a member of this conversation')
    }

    return message as unknown as MessageWithRelations
  }

  /**
   * Edit a message with edit history tracking
   */
  async editMessage(
    messageId: string,
    userId: string,
    updateData: UpdateMessageInput,
  ): Promise<MessageWithRelations> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        isDeleted: false,
      },
    })

    if (!message) {
      throw new NotFoundException('Message not found or you are not the sender')
    }

    // Check if content is actually different
    if (message.content === updateData.content) {
      throw new BadRequestException('New content is the same as current content')
    }

    // Use transaction to ensure atomicity
    const updatedMessage = await this.prisma.$transaction(async (tx) => {
      // Create edit history record
      await tx.messageEdit.create({
        data: {
          messageId,
          previousContent: message.content,
          editedAt: new Date(),
        },
      })

      // Update the message
      return tx.message.update({
        where: { id: messageId },
        data: {
          content: updateData.content,
          isEdited: true,
          editedAt: new Date(),
        },
        include: this.getMessageInclude(),
      })
    })

    // Update message in search index (async, don't wait)
    this.searchService.updateMessageIndex(messageId).catch(error => {
      console.error(`Failed to update message index ${messageId}:`, error)
    })

    return updatedMessage as unknown as MessageWithRelations
  }

  /**
   * Delete a message with soft delete and tombstone records
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        isDeleted: false,
      },
    })

    if (!message) {
      throw new NotFoundException('Message not found or you are not the sender')
    }

    // Soft delete with tombstone
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[This message was deleted]', // Tombstone content
      },
    })

    // Remove message from search index (async, don't wait)
    this.searchService.removeMessageFromIndex(messageId).catch(error => {
      console.error(`Failed to remove message from index ${messageId}:`, error)
    })
  }

  /**
   * Get message edit history
   */
  async getMessageEditHistory(messageId: string, userId: string): Promise<MessageEditHistory[]> {
    // First verify user can access this message
    const message = await this.getMessage(messageId, userId)

    const edits = await this.prisma.messageEdit.findMany({
      where: { messageId },
      orderBy: { editedAt: 'desc' },
    })

    return edits.map(edit => ({
      id: edit.id,
      previousContent: edit.previousContent,
      editedAt: edit.editedAt,
    }))
  }

  /**
   * Search messages in a conversation using enhanced search service
   */
  async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MessageSearchResult> {
    const searchOptions: MessageSearchOptions = {
      conversationId,
      userId,
      query,
      limit,
      offset,
    }

    const result = await this.messageSearchService.searchMessages(searchOptions)
    
    return {
      messages: result.messages,
      total: result.total,
      hasMore: result.hasMore,
    }
  }

  /**
   * Advanced search across all user's conversations
   */
  async searchAllMessages(
    userId: string,
    query: string,
    options: {
      limit?: number
      offset?: number
      dateFrom?: Date
      dateTo?: Date
      messageTypes?: string[]
    } = {},
  ): Promise<MessageSearchResult> {
    const searchOptions: MessageSearchOptions = {
      userId,
      query,
      limit: options.limit || 50,
      offset: options.offset || 0,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      messageType: options.messageTypes,
    }

    const result = await this.messageSearchService.searchMessages(searchOptions)
    
    return {
      messages: result.messages,
      total: result.total,
      hasMore: result.hasMore,
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(userId: string, partialQuery: string): Promise<string[]> {
    return this.messageSearchService.getSearchSuggestions(userId, partialQuery)
  }

  /**
   * Mark messages as read for a user
   */
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<void> {
    // Verify user is a member and message exists
    const [conversationMember, message] = await Promise.all([
      this.prisma.conversationMember.findFirst({
        where: {
          conversationId,
          userId,
          isActive: true,
        },
      }),
      this.prisma.message.findFirst({
        where: {
          id: messageId,
          conversationId,
          isDeleted: false,
        },
      }),
    ])

    if (!conversationMember) {
      throw new ForbiddenException('User is not a member of this conversation')
    }

    if (!message) {
      throw new NotFoundException('Message not found')
    }

    // Update last read message for the user
    await this.prisma.conversationMember.update({
      where: {
        id: conversationMember.id,
      },
      data: {
        lastReadMessageId: messageId,
        lastReadAt: new Date(),
      },
    })

    // Create read receipt
    await this.prisma.messageReceipt.upsert({
      where: {
        messageId_userId_type: {
          messageId,
          userId,
          type: 'READ',
        },
      },
      update: {
        timestamp: new Date(),
      },
      create: {
        messageId,
        userId,
        type: 'READ',
        timestamp: new Date(),
      },
    })
  }

  /**
   * Get unread message count for a conversation
   */
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const conversationMember = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
    })

    if (!conversationMember) {
      return 0
    }

    const where: Prisma.MessageWhereInput = {
      conversationId,
      isDeleted: false,
      senderId: { not: userId }, // Don't count own messages
    }

    // If user has read some messages, count only newer ones
    if (conversationMember.lastReadMessageId) {
      where.id = {
        gt: conversationMember.lastReadMessageId,
      }
    }

    return this.prisma.message.count({ where })
  }

  /**
   * Helper method to get consistent message include options
   */
  private getMessageInclude(): Prisma.MessageInclude {
    return {
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
      attachments: {
        select: {
          id: true,
          objectKey: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          width: true,
          height: true,
          durationMs: true,
          thumbnailKey: true,
        },
      },
      edits: {
        orderBy: { editedAt: 'desc' },
        take: 1, // Only get the most recent edit for the main query
      },
      _count: {
        select: {
          receipts: true,
        },
      },
    }
  }
}