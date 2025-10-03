import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MeiliSearch, Index } from 'meilisearch'

export interface SearchDocument {
  id: string
  type: 'message' | 'user' | 'conversation'
  content: string
  metadata: Record<string, any>
  createdAt: number
  updatedAt: number
}

export interface SearchOptions {
  query: string
  filters?: string[]
  sort?: string[]
  limit?: number
  offset?: number
  attributesToHighlight?: string[]
  attributesToCrop?: string[]
  cropLength?: number
}

export interface SearchResult<T = any> {
  hits: T[]
  query: string
  processingTimeMs: number
  limit: number
  offset: number
  estimatedTotalHits: number
}

@Injectable()
export class MeiliSearchService implements OnModuleInit {
  private readonly logger = new Logger(MeiliSearchService.name)
  private client: MeiliSearch
  public messagesIndex: Index
  public usersIndex: Index
  public conversationsIndex: Index

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get('MEILISEARCH_HOST', 'http://localhost:7700')
    const apiKey = this.configService.get('MEILISEARCH_API_KEY', 'masterKey123')
    
    this.client = new MeiliSearch({
      host,
      apiKey,
    })
  }

  async onModuleInit() {
    try {
      await this.initializeIndexes()
      this.logger.log('MeiliSearch service initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize MeiliSearch service', error)
      throw error
    }
  }

  private async initializeIndexes() {
    // Initialize messages index
    this.messagesIndex = this.client.index('messages')
    await this.configureMessagesIndex()

    // Initialize users index
    this.usersIndex = this.client.index('users')
    await this.configureUsersIndex()

    // Initialize conversations index
    this.conversationsIndex = this.client.index('conversations')
    await this.configureConversationsIndex()
  }

  private async configureMessagesIndex() {
    try {
      // Configure searchable attributes
      await this.messagesIndex.updateSearchableAttributes([
        'content',
        'senderName',
        'senderUsername',
        'attachmentNames',
      ])

      // Configure filterable attributes
      await this.messagesIndex.updateFilterableAttributes([
        'conversationId',
        'senderId',
        'type',
        'hasAttachments',
        'createdAt',
        'isReply',
      ])

      // Configure sortable attributes
      await this.messagesIndex.updateSortableAttributes([
        'createdAt',
        'updatedAt',
      ])

      // Configure ranking rules for relevance
      await this.messagesIndex.updateRankingRules([
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'createdAt:desc', // Prefer newer messages
      ])

      // Configure displayed attributes
      await this.messagesIndex.updateDisplayedAttributes([
        'id',
        'conversationId',
        'senderId',
        'senderName',
        'senderUsername',
        'content',
        'type',
        'createdAt',
        'hasAttachments',
        'attachmentTypes',
        'isReply',
        'replyToContent',
      ])

      this.logger.log('Messages index configured successfully')
    } catch (error) {
      this.logger.error('Failed to configure messages index', error)
      throw error
    }
  }

  private async configureUsersIndex() {
    try {
      await this.usersIndex.updateSearchableAttributes([
        'username',
        'name',
        'bio',
      ])

      await this.usersIndex.updateFilterableAttributes([
        'isActive',
        'createdAt',
      ])

      await this.usersIndex.updateSortableAttributes([
        'username',
        'name',
        'createdAt',
      ])

      await this.usersIndex.updateRankingRules([
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ])

      this.logger.log('Users index configured successfully')
    } catch (error) {
      this.logger.error('Failed to configure users index', error)
      throw error
    }
  }

  private async configureConversationsIndex() {
    try {
      await this.conversationsIndex.updateSearchableAttributes([
        'title',
        'memberNames',
        'memberUsernames',
      ])

      await this.usersIndex.updateFilterableAttributes([
        'type',
        'memberIds',
        'createdAt',
        'isActive',
      ])

      await this.conversationsIndex.updateSortableAttributes([
        'title',
        'createdAt',
        'updatedAt',
      ])

      this.logger.log('Conversations index configured successfully')
    } catch (error) {
      this.logger.error('Failed to configure conversations index', error)
      throw error
    }
  }

  // Message indexing methods
  async indexMessage(document: any): Promise<void> {
    try {
      await this.messagesIndex.addDocuments([document])
      this.logger.debug(`Indexed message: ${document.id}`)
    } catch (error) {
      this.logger.error(`Failed to index message ${document.id}`, error)
      throw error
    }
  }

  async updateMessage(document: any): Promise<void> {
    try {
      await this.messagesIndex.updateDocuments([document])
      this.logger.debug(`Updated message index: ${document.id}`)
    } catch (error) {
      this.logger.error(`Failed to update message ${document.id}`, error)
      throw error
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await this.messagesIndex.deleteDocument(messageId)
      this.logger.debug(`Deleted message from index: ${messageId}`)
    } catch (error) {
      this.logger.error(`Failed to delete message ${messageId}`, error)
      throw error
    }
  }

  async searchMessages(options: SearchOptions): Promise<SearchResult> {
    try {
      const searchParams: any = {
        limit: options.limit || 50,
        offset: options.offset || 0,
      }

      if (options.filters && options.filters.length > 0) {
        searchParams.filter = options.filters
      }

      if (options.sort && options.sort.length > 0) {
        searchParams.sort = options.sort
      }

      if (options.attributesToHighlight) {
        searchParams.attributesToHighlight = options.attributesToHighlight
      }

      if (options.attributesToCrop) {
        searchParams.attributesToCrop = options.attributesToCrop
        searchParams.cropLength = options.cropLength || 200
      }

      const result = await this.messagesIndex.search(options.query, searchParams)
      
      return {
        hits: result.hits,
        query: result.query,
        processingTimeMs: result.processingTimeMs,
        limit: result.limit || options.limit || 50,
        offset: result.offset || options.offset || 0,
        estimatedTotalHits: result.estimatedTotalHits || 0,
      }
    } catch (error) {
      this.logger.error('Failed to search messages', error)
      throw error
    }
  }

  // User indexing methods
  async indexUser(document: any): Promise<void> {
    try {
      await this.usersIndex.addDocuments([document])
      this.logger.debug(`Indexed user: ${document.id}`)
    } catch (error) {
      this.logger.error(`Failed to index user ${document.id}`, error)
      throw error
    }
  }

  async updateUser(document: any): Promise<void> {
    try {
      await this.usersIndex.updateDocuments([document])
      this.logger.debug(`Updated user index: ${document.id}`)
    } catch (error) {
      this.logger.error(`Failed to update user ${document.id}`, error)
      throw error
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.usersIndex.deleteDocument(userId)
      this.logger.debug(`Deleted user from index: ${userId}`)
    } catch (error) {
      this.logger.error(`Failed to delete user ${userId}`, error)
      throw error
    }
  }

  async searchUsers(options: SearchOptions): Promise<SearchResult> {
    try {
      const searchParams: any = {
        limit: options.limit || 20,
        offset: options.offset || 0,
      }

      if (options.filters && options.filters.length > 0) {
        searchParams.filter = options.filters
      }

      if (options.sort && options.sort.length > 0) {
        searchParams.sort = options.sort
      }

      const result = await this.usersIndex.search(options.query, searchParams)
      
      return {
        hits: result.hits,
        query: result.query,
        processingTimeMs: result.processingTimeMs,
        limit: result.limit || options.limit || 20,
        offset: result.offset || options.offset || 0,
        estimatedTotalHits: result.estimatedTotalHits || 0,
      }
    } catch (error) {
      this.logger.error('Failed to search users', error)
      throw error
    }
  }

  // Conversation indexing methods
  async indexConversation(document: any): Promise<void> {
    try {
      await this.conversationsIndex.addDocuments([document])
      this.logger.debug(`Indexed conversation: ${document.id}`)
    } catch (error) {
      this.logger.error(`Failed to index conversation ${document.id}`, error)
      throw error
    }
  }

  async updateConversation(document: any): Promise<void> {
    try {
      await this.conversationsIndex.updateDocuments([document])
      this.logger.debug(`Updated conversation index: ${document.id}`)
    } catch (error) {
      this.logger.error(`Failed to update conversation ${document.id}`, error)
      throw error
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.conversationsIndex.deleteDocument(conversationId)
      this.logger.debug(`Deleted conversation from index: ${conversationId}`)
    } catch (error) {
      this.logger.error(`Failed to delete conversation ${conversationId}`, error)
      throw error
    }
  }

  async searchConversations(options: SearchOptions): Promise<SearchResult> {
    try {
      const searchParams: any = {
        limit: options.limit || 20,
        offset: options.offset || 0,
      }

      if (options.filters && options.filters.length > 0) {
        searchParams.filter = options.filters
      }

      if (options.sort && options.sort.length > 0) {
        searchParams.sort = options.sort
      }

      const result = await this.conversationsIndex.search(options.query, searchParams)
      
      return {
        hits: result.hits,
        query: result.query,
        processingTimeMs: result.processingTimeMs,
        limit: result.limit || options.limit || 20,
        offset: result.offset || options.offset || 0,
        estimatedTotalHits: result.estimatedTotalHits || 0,
      }
    } catch (error) {
      this.logger.error('Failed to search conversations', error)
      throw error
    }
  }

  // Utility methods
  async getIndexStats() {
    try {
      const [messagesStats, usersStats, conversationsStats] = await Promise.all([
        this.messagesIndex.getStats(),
        this.usersIndex.getStats(),
        this.conversationsIndex.getStats(),
      ])

      return {
        messages: messagesStats,
        users: usersStats,
        conversations: conversationsStats,
      }
    } catch (error) {
      this.logger.error('Failed to get index stats', error)
      throw error
    }
  }

  async clearIndex(indexName: 'messages' | 'users' | 'conversations'): Promise<void> {
    try {
      const index = this.getIndex(indexName)
      await index.deleteAllDocuments()
      this.logger.log(`Cleared ${indexName} index`)
    } catch (error) {
      this.logger.error(`Failed to clear ${indexName} index`, error)
      throw error
    }
  }

  private getIndex(indexName: string): Index {
    switch (indexName) {
      case 'messages':
        return this.messagesIndex
      case 'users':
        return this.usersIndex
      case 'conversations':
        return this.conversationsIndex
      default:
        throw new Error(`Unknown index: ${indexName}`)
    }
  }
}