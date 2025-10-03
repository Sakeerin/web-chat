import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { MessageWithRelations } from '../interfaces/message.interface'

export interface MessageSearchOptions {
  conversationId?: string
  userId: string
  query: string
  limit?: number
  offset?: number
  dateFrom?: Date
  dateTo?: Date
  messageType?: string[]
}

export interface MessageSearchResult {
  messages: MessageWithRelations[]
  total: number
  hasMore: boolean
  searchTime: number
}

@Injectable()
export class MessageSearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search messages with advanced filtering and indexing preparation
   * This method prepares the groundwork for future search engine integration
   */
  async searchMessages(options: MessageSearchOptions): Promise<MessageSearchResult> {
    const startTime = Date.now()
    const { conversationId, userId, query, limit = 50, offset = 0, dateFrom, dateTo, messageType } = options

    // Verify user has access to the conversation if specified
    if (conversationId) {
      const conversationMember = await this.prisma.conversationMember.findFirst({
        where: {
          conversationId,
          userId,
          isActive: true,
        },
      })

      if (!conversationMember) {
        throw new Error('User is not a member of this conversation')
      }
    }

    // Build search query with proper indexing hints
    const whereClause: any = {
      isDeleted: false,
      content: {
        contains: query,
        mode: 'insensitive',
      },
    }

    // Add conversation filter if specified
    if (conversationId) {
      whereClause.conversationId = conversationId
    } else {
      // If no specific conversation, only search in conversations user is a member of
      whereClause.conversation = {
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
      }
    }

    // Add date range filters
    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) whereClause.createdAt.gte = dateFrom
      if (dateTo) whereClause.createdAt.lte = dateTo
    }

    // Add message type filter
    if (messageType && messageType.length > 0) {
      whereClause.type = {
        in: messageType,
      }
    }

    // Execute search with proper includes for performance
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true,
            },
          },
          conversation: {
            select: {
              id: true,
              type: true,
              title: true,
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
          _count: {
            select: {
              receipts: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' }, // Most recent first
          { id: 'desc' }, // Secondary sort by ULID for consistency
        ],
        take: limit,
        skip: offset,
      }),
      this.prisma.message.count({ where: whereClause }),
    ])

    const searchTime = Date.now() - startTime

    return {
      messages: messages as unknown as MessageWithRelations[],
      total,
      hasMore: offset + messages.length < total,
      searchTime,
    }
  }

  /**
   * Prepare message content for search indexing
   * This method extracts and normalizes content for external search engines
   */
  prepareMessageForIndexing(message: MessageWithRelations): MessageSearchDocument {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderUsername: message.sender.username,
      senderName: message.sender.name,
      content: this.normalizeContent(message.content),
      type: message.type,
      createdAt: message.createdAt,
      hasAttachments: message.attachments.length > 0,
      attachmentTypes: message.attachments.map(a => a.mimeType),
      isReply: !!message.replyToId,
      replyToContent: message.replyTo?.content,
    }
  }

  /**
   * Normalize content for better search results
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Get search suggestions based on user's message history
   */
  async getSearchSuggestions(userId: string, partialQuery: string, limit: number = 5): Promise<string[]> {
    if (partialQuery.length < 2) return []

    // Get recent unique words from user's conversations
    const recentMessages = await this.prisma.message.findMany({
      where: {
        conversation: {
          members: {
            some: {
              userId,
              isActive: true,
            },
          },
        },
        isDeleted: false,
        content: {
          contains: partialQuery,
          mode: 'insensitive',
        },
      },
      select: {
        content: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Sample recent messages
    })

    // Extract words that start with the partial query
    const suggestions = new Set<string>()
    const queryLower = partialQuery.toLowerCase()

    recentMessages.forEach(message => {
      const words = message.content.toLowerCase().split(/\s+/)
      words.forEach(word => {
        const cleanWord = word.replace(/[^\w]/g, '')
        if (cleanWord.startsWith(queryLower) && cleanWord.length > queryLower.length) {
          suggestions.add(cleanWord)
        }
      })
    })

    return Array.from(suggestions).slice(0, limit)
  }
}

export interface MessageSearchDocument {
  id: string
  conversationId: string
  senderId: string
  senderUsername: string
  senderName: string
  content: string
  type: string
  createdAt: Date
  hasAttachments: boolean
  attachmentTypes: string[]
  isReply: boolean
  replyToContent?: string
}