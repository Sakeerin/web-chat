import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { MeiliSearchService, SearchOptions, SearchResult } from './meilisearch.service'

export interface MessageSearchOptions {
  query: string
  userId: string
  conversationId?: string
  limit?: number
  offset?: number
  dateFrom?: Date
  dateTo?: Date
  messageTypes?: string[]
  hasAttachments?: boolean
}

export interface UserSearchOptions {
  query: string
  currentUserId: string
  limit?: number
  offset?: number
  excludeBlocked?: boolean
}

export interface ConversationSearchOptions {
  query: string
  userId: string
  limit?: number
  offset?: number
  conversationType?: 'dm' | 'group' | 'channel'
}

export interface SearchSuggestion {
  text: string
  type: 'recent' | 'popular' | 'contact'
  metadata?: Record<string, any>
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly meilisearch: MeiliSearchService,
  ) {}

  /**
   * Search messages with advanced filtering and highlighting
   */
  async searchMessages(options: MessageSearchOptions): Promise<SearchResult> {
    const { query, userId, conversationId, limit = 50, offset = 0, dateFrom, dateTo, messageTypes, hasAttachments } = options

    // Build filters for MeiliSearch
    const filters: string[] = []

    // User access control - only search in conversations user is a member of
    if (conversationId) {
      // Verify user has access to the specific conversation
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

      filters.push(`conversationId = "${conversationId}"`)
    } else {
      // Get all conversation IDs user is a member of
      const userConversations = await this.prisma.conversationMember.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          conversationId: true,
        },
      })

      const conversationIds = userConversations.map(c => c.conversationId)
      if (conversationIds.length === 0) {
        return {
          hits: [],
          query,
          processingTimeMs: 0,
          limit,
          offset,
          estimatedTotalHits: 0,
        }
      }

      const conversationFilter = conversationIds.map(id => `conversationId = "${id}"`).join(' OR ')
      filters.push(`(${conversationFilter})`)
    }

    // Date range filters
    if (dateFrom) {
      filters.push(`createdAt >= ${Math.floor(dateFrom.getTime() / 1000)}`)
    }
    if (dateTo) {
      filters.push(`createdAt <= ${Math.floor(dateTo.getTime() / 1000)}`)
    }

    // Message type filters
    if (messageTypes && messageTypes.length > 0) {
      const typeFilter = messageTypes.map(type => `type = "${type}"`).join(' OR ')
      filters.push(`(${typeFilter})`)
    }

    // Attachment filter
    if (hasAttachments !== undefined) {
      filters.push(`hasAttachments = ${hasAttachments}`)
    }

    const searchOptions: SearchOptions = {
      query,
      filters,
      limit,
      offset,
      sort: ['createdAt:desc'],
      attributesToHighlight: ['content', 'senderName'],
      attributesToCrop: ['content'],
      cropLength: 200,
    }

    try {
      const result = await this.meilisearch.searchMessages(searchOptions)
      
      // Log search performance
      if (result.processingTimeMs > 300) {
        this.logger.warn(`Slow search query: ${query} took ${result.processingTimeMs}ms`)
      }

      return result
    } catch (error) {
      this.logger.error('Message search failed', error)
      throw error
    }
  }

  /**
   * Search users/contacts with privacy controls
   */
  async searchUsers(options: UserSearchOptions): Promise<SearchResult> {
    const { query, currentUserId, limit = 20, offset = 0, excludeBlocked = true } = options

    const filters: string[] = ['isActive = true']

    // Exclude blocked users if requested
    if (excludeBlocked) {
      const blockedUsers = await this.prisma.blockedUser.findMany({
        where: {
          blockingUserId: currentUserId,
        },
        select: {
          blockedUserId: true,
        },
      })

      if (blockedUsers.length > 0) {
        const blockedIds = blockedUsers.map(b => b.blockedUserId)
        const blockedFilter = blockedIds.map(id => `id != "${id}"`).join(' AND ')
        filters.push(`(${blockedFilter})`)
      }
    }

    const searchOptions: SearchOptions = {
      query,
      filters,
      limit,
      offset,
      sort: ['username:asc'],
      attributesToHighlight: ['username', 'name'],
    }

    try {
      return await this.meilisearch.searchUsers(searchOptions)
    } catch (error) {
      this.logger.error('User search failed', error)
      throw error
    }
  }

  /**
   * Search conversations user is a member of
   */
  async searchConversations(options: ConversationSearchOptions): Promise<SearchResult> {
    const { query, userId, limit = 20, offset = 0, conversationType } = options

    // Get conversation IDs user is a member of
    const userConversations = await this.prisma.conversationMember.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        conversationId: true,
      },
    })

    const conversationIds = userConversations.map(c => c.conversationId)
    if (conversationIds.length === 0) {
      return {
        hits: [],
        query,
        processingTimeMs: 0,
        limit,
        offset,
        estimatedTotalHits: 0,
      }
    }

    const filters: string[] = []
    
    // Filter by user's conversations
    const conversationFilter = conversationIds.map(id => `id = "${id}"`).join(' OR ')
    filters.push(`(${conversationFilter})`)

    // Filter by conversation type if specified
    if (conversationType) {
      filters.push(`type = "${conversationType}"`)
    }

    filters.push('isActive = true')

    const searchOptions: SearchOptions = {
      query,
      filters,
      limit,
      offset,
      sort: ['updatedAt:desc'],
      attributesToHighlight: ['title', 'memberNames'],
    }

    try {
      return await this.meilisearch.searchConversations(searchOptions)
    } catch (error) {
      this.logger.error('Conversation search failed', error)
      throw error
    }
  }

  /**
   * Get search suggestions based on user's history and contacts
   */
  async getSearchSuggestions(userId: string, partialQuery: string, limit: number = 5): Promise<SearchSuggestion[]> {
    if (partialQuery.length < 2) return []

    const suggestions: SearchSuggestion[] = []

    try {
      // Get recent search terms from user's message history
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
        take: 50,
      })

      // Extract unique words that start with the partial query
      const recentTerms = new Set<string>()
      const queryLower = partialQuery.toLowerCase()

      recentMessages.forEach(message => {
        const words = message.content.toLowerCase().split(/\s+/)
        words.forEach(word => {
          const cleanWord = word.replace(/[^\w]/g, '')
          if (cleanWord.startsWith(queryLower) && cleanWord.length > queryLower.length && cleanWord.length <= 20) {
            recentTerms.add(cleanWord)
          }
        })
      })

      // Add recent terms as suggestions
      Array.from(recentTerms).slice(0, 3).forEach(term => {
        suggestions.push({
          text: term,
          type: 'recent',
        })
      })

      // Get contact suggestions
      const contacts = await this.prisma.contactRequest.findMany({
        where: {
          OR: [
            {
              senderId: userId,
              status: 'ACCEPTED',
              receiver: {
                OR: [
                  {
                    username: {
                      contains: partialQuery,
                      mode: 'insensitive',
                    },
                  },
                  {
                    name: {
                      contains: partialQuery,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
            {
              receiverId: userId,
              status: 'ACCEPTED',
              sender: {
                OR: [
                  {
                    username: {
                      contains: partialQuery,
                      mode: 'insensitive',
                    },
                  },
                  {
                    name: {
                      contains: partialQuery,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
        take: 2,
      })

      contacts.forEach(contact => {
        const contactUser = contact.senderId === userId ? contact.receiver : contact.sender
        suggestions.push({
          text: contactUser.username || contactUser.name,
          type: 'contact',
          metadata: {
            userId: contactUser.id,
            name: contactUser.name,
          },
        })
      })

      return suggestions.slice(0, limit)
    } catch (error) {
      this.logger.error('Failed to get search suggestions', error)
      return []
    }
  }

  /**
   * Index a message for search
   */
  async indexMessage(messageId: string): Promise<void> {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
          attachments: {
            select: {
              fileName: true,
              mimeType: true,
            },
          },
          replyTo: {
            select: {
              content: true,
            },
          },
        },
      })

      if (!message || message.isDeleted) {
        return
      }

      const searchDocument = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.sender.name,
        senderUsername: message.sender.username,
        content: message.content,
        type: message.type,
        createdAt: Math.floor(message.createdAt.getTime() / 1000),
        hasAttachments: message.attachments.length > 0,
        attachmentTypes: message.attachments.map(a => a.mimeType),
        attachmentNames: message.attachments.map(a => a.fileName).join(' '),
        isReply: !!message.replyToId,
        replyToContent: message.replyTo?.content || '',
      }

      await this.meilisearch.indexMessage(searchDocument)
    } catch (error) {
      this.logger.error(`Failed to index message ${messageId}`, error)
      throw error
    }
  }

  /**
   * Update message in search index
   */
  async updateMessageIndex(messageId: string): Promise<void> {
    await this.indexMessage(messageId) // MeiliSearch handles updates the same as inserts
  }

  /**
   * Remove message from search index
   */
  async removeMessageFromIndex(messageId: string): Promise<void> {
    try {
      await this.meilisearch.deleteMessage(messageId)
    } catch (error) {
      this.logger.error(`Failed to remove message ${messageId} from index`, error)
      throw error
    }
  }

  /**
   * Index a user for search
   */
  async indexUser(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          bio: true,
          avatarUrl: true,
          createdAt: true,
          isActive: true,
        },
      })

      if (!user || !user.isActive) {
        return
      }

      const searchDocument = {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio || '',
        avatarUrl: user.avatarUrl,
        createdAt: Math.floor(user.createdAt.getTime() / 1000),
        isActive: user.isActive,
      }

      await this.meilisearch.indexUser(searchDocument)
    } catch (error) {
      this.logger.error(`Failed to index user ${userId}`, error)
      throw error
    }
  }

  /**
   * Index a conversation for search
   */
  async indexConversation(conversationId: string): Promise<void> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          members: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      if (!conversation) {
        return
      }

      const memberIds = conversation.members.map(m => m.userId)
      const memberNames = conversation.members.map(m => m.user.name).filter(Boolean)
      const memberUsernames = conversation.members.map(m => m.user.username).filter(Boolean)

      const searchDocument = {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title || '',
        memberIds,
        memberNames: memberNames.join(' '),
        memberUsernames: memberUsernames.join(' '),
        createdAt: Math.floor(conversation.createdAt.getTime() / 1000),
        updatedAt: Math.floor(conversation.updatedAt.getTime() / 1000),
        isActive: true,
      }

      await this.meilisearch.indexConversation(searchDocument)
    } catch (error) {
      this.logger.error(`Failed to index conversation ${conversationId}`, error)
      throw error
    }
  }

  /**
   * Bulk index messages for initial setup or re-indexing
   */
  async bulkIndexMessages(batchSize: number = 1000): Promise<void> {
    this.logger.log('Starting bulk message indexing...')
    
    let offset = 0
    let processedCount = 0

    try {
      while (true) {
        const messages = await this.prisma.message.findMany({
          where: {
            isDeleted: false,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
            attachments: {
              select: {
                fileName: true,
                mimeType: true,
              },
            },
            replyTo: {
              select: {
                content: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: batchSize,
          skip: offset,
        })

        if (messages.length === 0) {
          break
        }

        const searchDocuments = messages.map(message => ({
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderName: message.sender.name,
          senderUsername: message.sender.username,
          content: message.content,
          type: message.type,
          createdAt: Math.floor(message.createdAt.getTime() / 1000),
          hasAttachments: message.attachments.length > 0,
          attachmentTypes: message.attachments.map(a => a.mimeType),
          attachmentNames: message.attachments.map(a => a.fileName).join(' '),
          isReply: !!message.replyToId,
          replyToContent: message.replyTo?.content || '',
        }))

        // Index batch
        await this.meilisearch.messagesIndex.addDocuments(searchDocuments)
        
        processedCount += messages.length
        offset += batchSize

        this.logger.log(`Indexed ${processedCount} messages...`)
      }

      this.logger.log(`Bulk indexing completed. Total messages indexed: ${processedCount}`)
    } catch (error) {
      this.logger.error('Bulk indexing failed', error)
      throw error
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats() {
    try {
      return await this.meilisearch.getIndexStats()
    } catch (error) {
      this.logger.error('Failed to get search stats', error)
      throw error
    }
  }
}