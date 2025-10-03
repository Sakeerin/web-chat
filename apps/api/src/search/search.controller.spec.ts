import { Test, TestingModule } from '@nestjs/testing'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

describe('SearchController', () => {
  let controller: SearchController
  let searchService: SearchService

  const mockSearchService = {
    searchMessages: jest.fn(),
    searchUsers: jest.fn(),
    searchConversations: jest.fn(),
    getSearchSuggestions: jest.fn(),
    getSearchStats: jest.fn(),
    bulkIndexMessages: jest.fn(),
    indexMessage: jest.fn(),
    indexUser: jest.fn(),
    indexConversation: jest.fn(),
  }

  const mockUser = {
    id: 'user_123',
    username: 'testuser',
    email: 'test@example.com',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<SearchController>(SearchController)
    searchService = module.get<SearchService>(SearchService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('searchMessages', () => {
    it('should search messages with valid parameters', async () => {
      const query = {
        q: 'hello world',
        conversationId: 'conv_123',
        limit: '25',
        offset: '10',
        dateFrom: '2023-01-01T00:00:00Z',
        dateTo: '2023-12-31T23:59:59Z',
        messageTypes: 'text,image',
        hasAttachments: 'true',
      }

      const expectedResult = {
        hits: [
          {
            id: 'msg_123',
            content: 'Hello world',
            senderId: 'user_456',
          },
        ],
        query: 'hello world',
        processingTimeMs: 5,
        limit: 25,
        offset: 10,
        estimatedTotalHits: 1,
      }

      mockSearchService.searchMessages.mockResolvedValue(expectedResult)

      const req = { user: mockUser }
      const result = await controller.searchMessages(query, req)

      expect(mockSearchService.searchMessages).toHaveBeenCalledWith({
        query: 'hello world',
        userId: 'user_123',
        conversationId: 'conv_123',
        limit: 25,
        offset: 10,
        dateFrom: new Date('2023-01-01T00:00:00Z'),
        dateTo: new Date('2023-12-31T23:59:59Z'),
        messageTypes: ['text', 'image'],
        hasAttachments: true,
      })

      expect(result).toEqual(expectedResult)
    })

    it('should use default values for optional parameters', async () => {
      const query = { q: 'hello' }
      const expectedResult = { hits: [], query: 'hello', processingTimeMs: 0, limit: 50, offset: 0, estimatedTotalHits: 0 }

      mockSearchService.searchMessages.mockResolvedValue(expectedResult)

      const req = { user: mockUser }
      await controller.searchMessages(query, req)

      expect(mockSearchService.searchMessages).toHaveBeenCalledWith({
        query: 'hello',
        userId: 'user_123',
        conversationId: undefined,
        limit: 50,
        offset: 0,
        dateFrom: undefined,
        dateTo: undefined,
        messageTypes: undefined,
        hasAttachments: undefined,
      })
    })

    it('should validate query parameters', async () => {
      const invalidQuery = { q: '' } // Empty query

      const req = { user: mockUser }

      await expect(controller.searchMessages(invalidQuery, req)).rejects.toThrow()
    })

    it('should validate limit bounds', async () => {
      const invalidQuery = { q: 'hello', limit: '200' } // Exceeds max limit

      const req = { user: mockUser }

      await expect(controller.searchMessages(invalidQuery, req)).rejects.toThrow()
    })
  })

  describe('searchUsers', () => {
    it('should search users with valid parameters', async () => {
      const query = {
        q: 'john',
        limit: '10',
        offset: '5',
        excludeBlocked: 'false',
      }

      const expectedResult = {
        hits: [
          {
            id: 'user_456',
            username: 'john_doe',
            name: 'John Doe',
          },
        ],
        query: 'john',
        processingTimeMs: 3,
        limit: 10,
        offset: 5,
        estimatedTotalHits: 1,
      }

      mockSearchService.searchUsers.mockResolvedValue(expectedResult)

      const req = { user: mockUser }
      const result = await controller.searchUsers(query, req)

      expect(mockSearchService.searchUsers).toHaveBeenCalledWith({
        query: 'john',
        currentUserId: 'user_123',
        limit: 10,
        offset: 5,
        excludeBlocked: false,
      })

      expect(result).toEqual(expectedResult)
    })

    it('should use default values', async () => {
      const query = { q: 'john' }
      const expectedResult = { hits: [], query: 'john', processingTimeMs: 0, limit: 20, offset: 0, estimatedTotalHits: 0 }

      mockSearchService.searchUsers.mockResolvedValue(expectedResult)

      const req = { user: mockUser }
      await controller.searchUsers(query, req)

      expect(mockSearchService.searchUsers).toHaveBeenCalledWith({
        query: 'john',
        currentUserId: 'user_123',
        limit: 20,
        offset: 0,
        excludeBlocked: true,
      })
    })
  })

  describe('searchConversations', () => {
    it('should search conversations with valid parameters', async () => {
      const query = {
        q: 'project',
        limit: '15',
        offset: '0',
        type: 'group',
      }

      const expectedResult = {
        hits: [
          {
            id: 'conv_123',
            title: 'Project Team',
            type: 'group',
          },
        ],
        query: 'project',
        processingTimeMs: 4,
        limit: 15,
        offset: 0,
        estimatedTotalHits: 1,
      }

      mockSearchService.searchConversations.mockResolvedValue(expectedResult)

      const req = { user: mockUser }
      const result = await controller.searchConversations(query, req)

      expect(mockSearchService.searchConversations).toHaveBeenCalledWith({
        query: 'project',
        userId: 'user_123',
        limit: 15,
        offset: 0,
        conversationType: 'group',
      })

      expect(result).toEqual(expectedResult)
    })

    it('should validate conversation type enum', async () => {
      const invalidQuery = { q: 'project', type: 'invalid' }

      const req = { user: mockUser }

      await expect(controller.searchConversations(invalidQuery, req)).rejects.toThrow()
    })
  })

  describe('getSearchSuggestions', () => {
    it('should get search suggestions', async () => {
      const query = { q: 'hel', limit: '3' }

      const expectedResult = [
        { text: 'hello', type: 'recent' },
        { text: 'help', type: 'recent' },
        { text: 'hello_user', type: 'contact', metadata: { userId: 'user_456' } },
      ]

      mockSearchService.getSearchSuggestions.mockResolvedValue(expectedResult)

      const req = { user: mockUser }
      const result = await controller.getSearchSuggestions(query, req)

      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith('user_123', 'hel', 3)
      expect(result).toEqual(expectedResult)
    })

    it('should use default limit', async () => {
      const query = { q: 'hel' }

      mockSearchService.getSearchSuggestions.mockResolvedValue([])

      const req = { user: mockUser }
      await controller.getSearchSuggestions(query, req)

      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith('user_123', 'hel', 5)
    })
  })

  describe('getSearchStats', () => {
    it('should get search statistics', async () => {
      const expectedStats = {
        messages: {
          numberOfDocuments: 1000,
          isIndexing: false,
          fieldDistribution: { content: 1000, senderId: 1000 },
        },
        users: {
          numberOfDocuments: 50,
          isIndexing: false,
          fieldDistribution: { username: 50, name: 50 },
        },
        conversations: {
          numberOfDocuments: 25,
          isIndexing: false,
          fieldDistribution: { title: 25, memberNames: 25 },
        },
      }

      mockSearchService.getSearchStats.mockResolvedValue(expectedStats)

      const result = await controller.getSearchStats()

      expect(mockSearchService.getSearchStats).toHaveBeenCalled()
      expect(result).toEqual(expectedStats)
    })
  })

  describe('reindexMessages', () => {
    it('should trigger message re-indexing', async () => {
      mockSearchService.bulkIndexMessages.mockResolvedValue(undefined)

      const req = { user: mockUser }
      const result = await controller.reindexMessages(req)

      expect(result).toEqual({ message: 'Message re-indexing started' })
      
      // Wait a bit to ensure the async call is made
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(mockSearchService.bulkIndexMessages).toHaveBeenCalled()
    })
  })

  describe('indexMessage', () => {
    it('should index a specific message', async () => {
      mockSearchService.indexMessage.mockResolvedValue(undefined)

      const result = await controller.indexMessage('msg_123')

      expect(mockSearchService.indexMessage).toHaveBeenCalledWith('msg_123')
      expect(result).toEqual({ message: 'Message indexed successfully' })
    })
  })

  describe('indexUser', () => {
    it('should index a specific user', async () => {
      mockSearchService.indexUser.mockResolvedValue(undefined)

      const result = await controller.indexUser('user_456')

      expect(mockSearchService.indexUser).toHaveBeenCalledWith('user_456')
      expect(result).toEqual({ message: 'User indexed successfully' })
    })
  })

  describe('indexConversation', () => {
    it('should index a specific conversation', async () => {
      mockSearchService.indexConversation.mockResolvedValue(undefined)

      const result = await controller.indexConversation('conv_456')

      expect(mockSearchService.indexConversation).toHaveBeenCalledWith('conv_456')
      expect(result).toEqual({ message: 'Conversation indexed successfully' })
    })
  })
})