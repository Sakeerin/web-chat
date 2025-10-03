import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { MeiliSearchService } from './meilisearch.service'

// Mock MeiliSearch
const mockMeiliSearch = {
  index: jest.fn(),
}

const mockIndex = {
  updateSearchableAttributes: jest.fn(),
  updateFilterableAttributes: jest.fn(),
  updateSortableAttributes: jest.fn(),
  updateRankingRules: jest.fn(),
  updateDisplayedAttributes: jest.fn(),
  addDocuments: jest.fn(),
  updateDocuments: jest.fn(),
  deleteDocument: jest.fn(),
  deleteAllDocuments: jest.fn(),
  search: jest.fn(),
  getStats: jest.fn(),
}

jest.mock('meilisearch', () => ({
  MeiliSearch: jest.fn(() => mockMeiliSearch),
}))

describe('MeiliSearchService', () => {
  let service: MeiliSearchService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeiliSearchService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config = {
                MEILISEARCH_HOST: 'http://localhost:7700',
                MEILISEARCH_API_KEY: 'testkey',
              }
              return config[key] || defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<MeiliSearchService>(MeiliSearchService)
    configService = module.get<ConfigService>(ConfigService)

    // Setup mock index
    mockMeiliSearch.index.mockReturnValue(mockIndex)
    mockIndex.updateSearchableAttributes.mockResolvedValue({})
    mockIndex.updateFilterableAttributes.mockResolvedValue({})
    mockIndex.updateSortableAttributes.mockResolvedValue({})
    mockIndex.updateRankingRules.mockResolvedValue({})
    mockIndex.updateDisplayedAttributes.mockResolvedValue({})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('MEILISEARCH_HOST', 'http://localhost:7700')
      expect(configService.get).toHaveBeenCalledWith('MEILISEARCH_API_KEY', 'masterKey123')
    })

    it('should configure indexes on module init', async () => {
      await service.onModuleInit()

      expect(mockMeiliSearch.index).toHaveBeenCalledWith('messages')
      expect(mockMeiliSearch.index).toHaveBeenCalledWith('users')
      expect(mockMeiliSearch.index).toHaveBeenCalledWith('conversations')
      
      expect(mockIndex.updateSearchableAttributes).toHaveBeenCalled()
      expect(mockIndex.updateFilterableAttributes).toHaveBeenCalled()
      expect(mockIndex.updateSortableAttributes).toHaveBeenCalled()
      expect(mockIndex.updateRankingRules).toHaveBeenCalled()
    })
  })

  describe('message operations', () => {
    beforeEach(async () => {
      await service.onModuleInit()
    })

    it('should index a message', async () => {
      const messageDoc = {
        id: 'msg_123',
        content: 'Hello world',
        senderId: 'user_123',
      }

      mockIndex.addDocuments.mockResolvedValue({ taskUid: 1 })

      await service.indexMessage(messageDoc)

      expect(mockIndex.addDocuments).toHaveBeenCalledWith([messageDoc])
    })

    it('should update a message', async () => {
      const messageDoc = {
        id: 'msg_123',
        content: 'Updated content',
        senderId: 'user_123',
      }

      mockIndex.updateDocuments.mockResolvedValue({ taskUid: 2 })

      await service.updateMessage(messageDoc)

      expect(mockIndex.updateDocuments).toHaveBeenCalledWith([messageDoc])
    })

    it('should delete a message', async () => {
      mockIndex.deleteDocument.mockResolvedValue({ taskUid: 3 })

      await service.deleteMessage('msg_123')

      expect(mockIndex.deleteDocument).toHaveBeenCalledWith('msg_123')
    })

    it('should search messages with filters', async () => {
      const searchResult = {
        hits: [
          {
            id: 'msg_123',
            content: 'Hello world',
            senderId: 'user_123',
          },
        ],
        query: 'hello',
        processingTimeMs: 5,
        limit: 50,
        offset: 0,
        estimatedTotalHits: 1,
      }

      mockIndex.search.mockResolvedValue(searchResult)

      const options = {
        query: 'hello',
        filters: ['conversationId = "conv_123"'],
        limit: 50,
        offset: 0,
      }

      const result = await service.searchMessages(options)

      expect(mockIndex.search).toHaveBeenCalledWith('hello', {
        limit: 50,
        offset: 0,
        filter: ['conversationId = "conv_123"'],
      })
      expect(result).toEqual(searchResult)
    })

    it('should search messages with highlighting and cropping', async () => {
      const searchResult = {
        hits: [
          {
            id: 'msg_123',
            content: 'Hello world',
            _formatted: {
              content: '<em>Hello</em> world',
            },
          },
        ],
        query: 'hello',
        processingTimeMs: 5,
        limit: 50,
        offset: 0,
        estimatedTotalHits: 1,
      }

      mockIndex.search.mockResolvedValue(searchResult)

      const options = {
        query: 'hello',
        attributesToHighlight: ['content'],
        attributesToCrop: ['content'],
        cropLength: 100,
      }

      const result = await service.searchMessages(options)

      expect(mockIndex.search).toHaveBeenCalledWith('hello', {
        limit: 50,
        offset: 0,
        attributesToHighlight: ['content'],
        attributesToCrop: ['content'],
        cropLength: 100,
      })
      expect(result.hits[0]._formatted).toBeDefined()
    })
  })

  describe('user operations', () => {
    beforeEach(async () => {
      await service.onModuleInit()
    })

    it('should index a user', async () => {
      const userDoc = {
        id: 'user_123',
        username: 'john_doe',
        name: 'John Doe',
      }

      mockIndex.addDocuments.mockResolvedValue({ taskUid: 4 })

      await service.indexUser(userDoc)

      expect(mockIndex.addDocuments).toHaveBeenCalledWith([userDoc])
    })

    it('should search users', async () => {
      const searchResult = {
        hits: [
          {
            id: 'user_123',
            username: 'john_doe',
            name: 'John Doe',
          },
        ],
        query: 'john',
        processingTimeMs: 3,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 1,
      }

      mockIndex.search.mockResolvedValue(searchResult)

      const options = {
        query: 'john',
        limit: 20,
        offset: 0,
      }

      const result = await service.searchUsers(options)

      expect(result).toEqual(searchResult)
    })
  })

  describe('conversation operations', () => {
    beforeEach(async () => {
      await service.onModuleInit()
    })

    it('should index a conversation', async () => {
      const conversationDoc = {
        id: 'conv_123',
        title: 'Project Team',
        type: 'group',
      }

      mockIndex.addDocuments.mockResolvedValue({ taskUid: 5 })

      await service.indexConversation(conversationDoc)

      expect(mockIndex.addDocuments).toHaveBeenCalledWith([conversationDoc])
    })

    it('should search conversations', async () => {
      const searchResult = {
        hits: [
          {
            id: 'conv_123',
            title: 'Project Team',
            type: 'group',
          },
        ],
        query: 'project',
        processingTimeMs: 4,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 1,
      }

      mockIndex.search.mockResolvedValue(searchResult)

      const options = {
        query: 'project',
        limit: 20,
        offset: 0,
      }

      const result = await service.searchConversations(options)

      expect(result).toEqual(searchResult)
    })
  })

  describe('utility methods', () => {
    beforeEach(async () => {
      await service.onModuleInit()
    })

    it('should get index stats', async () => {
      const stats = {
        numberOfDocuments: 100,
        isIndexing: false,
        fieldDistribution: {
          content: 100,
          senderId: 100,
        },
      }

      mockIndex.getStats.mockResolvedValue(stats)

      const result = await service.getIndexStats()

      expect(result).toEqual({
        messages: stats,
        users: stats,
        conversations: stats,
      })
    })

    it('should clear an index', async () => {
      mockIndex.deleteAllDocuments.mockResolvedValue({ taskUid: 6 })

      await service.clearIndex('messages')

      expect(mockIndex.deleteAllDocuments).toHaveBeenCalled()
    })

    it('should throw error for unknown index', async () => {
      await expect(service.clearIndex('unknown' as any)).rejects.toThrow('Unknown index: unknown')
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await service.onModuleInit()
    })

    it('should handle indexing errors', async () => {
      const error = new Error('Indexing failed')
      mockIndex.addDocuments.mockRejectedValue(error)

      await expect(service.indexMessage({ id: 'msg_123' })).rejects.toThrow('Indexing failed')
    })

    it('should handle search errors', async () => {
      const error = new Error('Search failed')
      mockIndex.search.mockRejectedValue(error)

      const options = { query: 'test' }
      await expect(service.searchMessages(options)).rejects.toThrow('Search failed')
    })
  })
})