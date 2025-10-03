import { Test, TestingModule } from '@nestjs/testing'
import { SearchService } from './search.service'
import { PrismaService } from '../database/prisma.service'
import { MeiliSearchService } from './meilisearch.service'

describe('SearchService', () => {
  let service: SearchService
  let prismaService: PrismaService
  let meilisearchService: MeiliSearchService

  const mockPrismaService = {
    conversationMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    contact: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
    },
  }

  const mockMeiliSearchService = {
    searchMessages: jest.fn(),
    searchUsers: jest.fn(),
    searchConversations: jest.fn(),
    indexMessage: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
    indexUser: jest.fn(),
    indexConversation: jest.fn(),
    getIndexStats: jest.fn(),
    messagesIndex: {
      addDocuments: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MeiliSearchService,
          useValue: mockMeiliSearchService,
        },
      ],
    }).compile()

    service = module.get<SearchService>(SearchService)
    prismaService = module.get<PrismaService>(PrismaService)
    meilisearchService = module.get<MeiliSearchService>(MeiliSearchService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('searchMessages', () => {
    const userId = 'user_123'
    const conversationId = 'conv_123'

    it('should search messages in a specific conversation', async () => {
      // Mock user is member of conversation
      mockPrismaService.conversationMember.findFirst.mockResolvedValue({
        userId,
        conversationId,
        isActive: true,
      })

      const searchResult = {
        hits: [
          {
            id: 'msg_123',
            content: 'Hello world',
            senderId: 'user_456',
          },
        ],
        query: 'hello',
        processingTimeMs: 5,
        limit: 50,
        offset: 0,
        estimatedTotalHits: 1,
      }

      mockMeiliSearchService.searchMessages.mockResolvedValue(searchResult)

      const options = {
        query: 'hello',
        userId,
        conversationId,
        limit: 50,
        offset: 0,
      }

      const result = await service.searchMessages(options)

      expect(mockPrismaService.conversationMember.findFirst).toHaveBeenCalledWith({
        where: {
          conversationId,
          userId,
          isActive: true,
        },
      })

      expect(mockMeiliSearchService.searchMessages).toHaveBeenCalledWith({
        query: 'hello',
        filters: [`conversationId = "${conversationId}"`],
        limit: 50,
        offset: 0,
        sort: ['createdAt:desc'],
        attributesToHighlight: ['content', 'senderName'],
        attributesToCrop: ['content'],
        cropLength: 200,
      })

      expect(result).toEqual(searchResult)
    })

    it('should throw error if user is not member of conversation', async () => {
      mockPrismaService.conversationMember.findFirst.mockResolvedValue(null)

      const options = {
        query: 'hello',
        userId,
        conversationId,
      }

      await expect(service.searchMessages(options)).rejects.toThrow(
        'User is not a member of this conversation'
      )
    })

    it('should search across all user conversations when no conversationId provided', async () => {
      mockPrismaService.conversationMember.findMany.mockResolvedValue([
        { conversationId: 'conv_1' },
        { conversationId: 'conv_2' },
      ])

      const searchResult = {
        hits: [],
        query: 'hello',
        processingTimeMs: 5,
        limit: 50,
        offset: 0,
        estimatedTotalHits: 0,
      }

      mockMeiliSearchService.searchMessages.mockResolvedValue(searchResult)

      const options = {
        query: 'hello',
        userId,
      }

      await service.searchMessages(options)

      expect(mockPrismaService.conversationMember.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
        },
        select: {
          conversationId: true,
        },
      })

      expect(mockMeiliSearchService.searchMessages).toHaveBeenCalledWith({
        query: 'hello',
        filters: ['(conversationId = "conv_1" OR conversationId = "conv_2")'],
        limit: 50,
        offset: 0,
        sort: ['createdAt:desc'],
        attributesToHighlight: ['content', 'senderName'],
        attributesToCrop: ['content'],
        cropLength: 200,
      })
    })

    it('should return empty results if user has no conversations', async () => {
      mockPrismaService.conversationMember.findMany.mockResolvedValue([])

      const options = {
        query: 'hello',
        userId,
      }

      const result = await service.searchMessages(options)

      expect(result).toEqual({
        hits: [],
        query: 'hello',
        processingTimeMs: 0,
        limit: 50,
        offset: 0,
        estimatedTotalHits: 0,
      })
    })

    it('should apply date range filters', async () => {
      mockPrismaService.conversationMember.findMany.mockResolvedValue([
        { conversationId: 'conv_1' },
      ])

      mockMeiliSearchService.searchMessages.mockResolvedValue({
        hits: [],
        query: 'hello',
        processingTimeMs: 5,
        limit: 50,
        offset: 0,
        estimatedTotalHits: 0,
      })

      const dateFrom = new Date('2023-01-01')
      const dateTo = new Date('2023-12-31')

      const options = {
        query: 'hello',
        userId,
        dateFrom,
        dateTo,
      }

      await service.searchMessages(options)

      expect(mockMeiliSearchService.searchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            `createdAt >= ${Math.floor(dateFrom.getTime() / 1000)}`,
            `createdAt <= ${Math.floor(dateTo.getTime() / 1000)}`,
          ]),
        })
      )
    })

    it('should apply message type filters', async () => {
      mockPrismaService.conversationMember.findMany.mockResolvedValue([
        { conversationId: 'conv_1' },
      ])

      mockMeiliSearchService.searchMessages.mockResolvedValue({
        hits: [],
        query: 'hello',
        processingTimeMs: 5,
        limit: 50,
        offset: 0,
        estimatedTotalHits: 0,
      })

      const options = {
        query: 'hello',
        userId,
        messageTypes: ['text', 'image'],
      }

      await service.searchMessages(options)

      expect(mockMeiliSearchService.searchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            '(type = "text" OR type = "image")',
          ]),
        })
      )
    })

    it('should apply attachment filter', async () => {
      mockPrismaService.conversationMember.findMany.mockResolvedValue([
        { conversationId: 'conv_1' },
      ])

      mockMeiliSearchService.searchMessages.mockResolvedValue({
        hits: [],
        query: 'hello',
        processingTimeMs: 5,
        limit: 50,
        offset: 0,
        estimatedTotalHits: 0,
      })

      const options = {
        query: 'hello',
        userId,
        hasAttachments: true,
      }

      await service.searchMessages(options)

      expect(mockMeiliSearchService.searchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining(['hasAttachments = true']),
        })
      )
    })
  })

  describe('searchUsers', () => {
    const currentUserId = 'user_123'

    it('should search users excluding blocked ones', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([
        { contactUserId: 'blocked_user_1' },
        { contactUserId: 'blocked_user_2' },
      ])

      const searchResult = {
        hits: [
          {
            id: 'user_456',
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

      mockMeiliSearchService.searchUsers.mockResolvedValue(searchResult)

      const options = {
        query: 'john',
        currentUserId,
        excludeBlocked: true,
      }

      const result = await service.searchUsers(options)

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: {
          userId: currentUserId,
          status: 'blocked',
        },
        select: {
          contactUserId: true,
        },
      })

      expect(mockMeiliSearchService.searchUsers).toHaveBeenCalledWith({
        query: 'john',
        filters: [
          'isActive = true',
          '(id != "blocked_user_1" AND id != "blocked_user_2")',
        ],
        limit: 20,
        offset: 0,
        sort: ['username:asc'],
        attributesToHighlight: ['username', 'name'],
      })

      expect(result).toEqual(searchResult)
    })

    it('should search users without excluding blocked ones', async () => {
      const searchResult = {
        hits: [],
        query: 'john',
        processingTimeMs: 3,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 0,
      }

      mockMeiliSearchService.searchUsers.mockResolvedValue(searchResult)

      const options = {
        query: 'john',
        currentUserId,
        excludeBlocked: false,
      }

      await service.searchUsers(options)

      expect(mockPrismaService.contact.findMany).not.toHaveBeenCalled()

      expect(mockMeiliSearchService.searchUsers).toHaveBeenCalledWith({
        query: 'john',
        filters: ['isActive = true'],
        limit: 20,
        offset: 0,
        sort: ['username:asc'],
        attributesToHighlight: ['username', 'name'],
      })
    })
  })

  describe('searchConversations', () => {
    const userId = 'user_123'

    it('should search conversations user is member of', async () => {
      mockPrismaService.conversationMember.findMany.mockResolvedValue([
        { conversationId: 'conv_1' },
        { conversationId: 'conv_2' },
      ])

      const searchResult = {
        hits: [
          {
            id: 'conv_1',
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

      mockMeiliSearchService.searchConversations.mockResolvedValue(searchResult)

      const options = {
        query: 'project',
        userId,
      }

      const result = await service.searchConversations(options)

      expect(mockMeiliSearchService.searchConversations).toHaveBeenCalledWith({
        query: 'project',
        filters: [
          '(id = "conv_1" OR id = "conv_2")',
          'isActive = true',
        ],
        limit: 20,
        offset: 0,
        sort: ['updatedAt:desc'],
        attributesToHighlight: ['title', 'memberNames'],
      })

      expect(result).toEqual(searchResult)
    })

    it('should return empty results if user has no conversations', async () => {
      mockPrismaService.conversationMember.findMany.mockResolvedValue([])

      const options = {
        query: 'project',
        userId,
      }

      const result = await service.searchConversations(options)

      expect(result).toEqual({
        hits: [],
        query: 'project',
        processingTimeMs: 0,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 0,
      })
    })

    it('should filter by conversation type', async () => {
      mockPrismaService.conversationMember.findMany.mockResolvedValue([
        { conversationId: 'conv_1' },
      ])

      mockMeiliSearchService.searchConversations.mockResolvedValue({
        hits: [],
        query: 'project',
        processingTimeMs: 4,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 0,
      })

      const options = {
        query: 'project',
        userId,
        conversationType: 'group' as const,
      }

      await service.searchConversations(options)

      expect(mockMeiliSearchService.searchConversations).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining(['type = "group"']),
        })
      )
    })
  })

  describe('getSearchSuggestions', () => {
    const userId = 'user_123'

    it('should return empty array for short queries', async () => {
      const result = await service.getSearchSuggestions(userId, 'a', 5)
      expect(result).toEqual([])
    })

    it('should get search suggestions from message history and contacts', async () => {
      mockPrismaService.message.findMany.mockResolvedValue([
        { content: 'hello world how are you' },
        { content: 'hello there general kenobi' },
      ])

      mockPrismaService.contact.findMany.mockResolvedValue([
        {
          contactUser: {
            id: 'user_456',
            username: 'hello_user',
            name: 'Hello User',
          },
        },
      ])

      const result = await service.getSearchSuggestions(userId, 'hel', 5)

      expect(result).toEqual([
        { text: 'hello', type: 'recent' },
        { text: 'hello_user', type: 'contact', metadata: { userId: 'user_456', name: 'Hello User' } },
      ])
    })
  })

  describe('indexMessage', () => {
    it('should index a message with all related data', async () => {
      const message = {
        id: 'msg_123',
        conversationId: 'conv_123',
        senderId: 'user_123',
        content: 'Hello world',
        type: 'text',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        isDeleted: false,
        replyToId: null,
        sender: {
          id: 'user_123',
          username: 'john_doe',
          name: 'John Doe',
        },
        attachments: [
          {
            fileName: 'image.jpg',
            mimeType: 'image/jpeg',
          },
        ],
        replyTo: null,
      }

      mockPrismaService.message.findUnique.mockResolvedValue(message)
      mockMeiliSearchService.indexMessage.mockResolvedValue(undefined)

      await service.indexMessage('msg_123')

      expect(mockPrismaService.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'msg_123' },
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

      expect(mockMeiliSearchService.indexMessage).toHaveBeenCalledWith({
        id: 'msg_123',
        conversationId: 'conv_123',
        senderId: 'user_123',
        senderName: 'John Doe',
        senderUsername: 'john_doe',
        content: 'Hello world',
        type: 'text',
        createdAt: Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000),
        hasAttachments: true,
        attachmentTypes: ['image/jpeg'],
        attachmentNames: 'image.jpg',
        isReply: false,
        replyToContent: '',
      })
    })

    it('should not index deleted messages', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue({
        id: 'msg_123',
        isDeleted: true,
      })

      await service.indexMessage('msg_123')

      expect(mockMeiliSearchService.indexMessage).not.toHaveBeenCalled()
    })

    it('should not index non-existent messages', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null)

      await service.indexMessage('msg_123')

      expect(mockMeiliSearchService.indexMessage).not.toHaveBeenCalled()
    })
  })

  describe('bulkIndexMessages', () => {
    it('should bulk index messages in batches', async () => {
      const messages = [
        {
          id: 'msg_1',
          conversationId: 'conv_1',
          senderId: 'user_1',
          content: 'Message 1',
          type: 'text',
          createdAt: new Date(),
          isDeleted: false,
          replyToId: null,
          sender: { id: 'user_1', username: 'user1', name: 'User 1' },
          attachments: [],
          replyTo: null,
        },
        {
          id: 'msg_2',
          conversationId: 'conv_1',
          senderId: 'user_2',
          content: 'Message 2',
          type: 'text',
          createdAt: new Date(),
          isDeleted: false,
          replyToId: null,
          sender: { id: 'user_2', username: 'user2', name: 'User 2' },
          attachments: [],
          replyTo: null,
        },
      ]

      mockPrismaService.message.findMany
        .mockResolvedValueOnce(messages)
        .mockResolvedValueOnce([]) // End of results

      mockMeiliSearchService.messagesIndex.addDocuments.mockResolvedValue({ taskUid: 1 })

      await service.bulkIndexMessages(2)

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
        take: 2,
        skip: 0,
      })

      expect(mockMeiliSearchService.messagesIndex.addDocuments).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'msg_1' }),
          expect.objectContaining({ id: 'msg_2' }),
        ])
      )
    })
  })
})