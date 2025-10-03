import { Test, TestingModule } from '@nestjs/testing'
import { MessageSearchService, MessageSearchOptions } from './message-search.service'
import { PrismaService } from '../../database/prisma.service'
import { MessageType } from '@prisma/client'

describe('MessageSearchService', () => {
  let service: MessageSearchService
  let prismaService: any

  const mockUser1 = {
    id: 'user-1',
    username: 'testuser1',
    name: 'Test User 1',
    avatarUrl: null,
  }

  const mockUser2 = {
    id: 'user-2',
    username: 'testuser2',
    name: 'Test User 2',
    avatarUrl: null,
  }

  const mockConversation = {
    id: 'conv-1',
    type: 'DM',
    title: null,
  }

  beforeEach(async () => {
    const mockPrismaService = {
      conversationMember: {
        findFirst: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageSearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<MessageSearchService>(MessageSearchService)
    prismaService = module.get(PrismaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('searchMessages', () => {
    it('should search messages in a specific conversation', async () => {
      const mockMember = {
        conversationId: 'conv-1',
        userId: 'user-1',
        isActive: true,
      }

      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-2',
          type: MessageType.TEXT,
          content: 'Hello world',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          sender: mockUser2,
          conversation: mockConversation,
          replyTo: null,
          attachments: [],
          _count: { receipts: 0 },
        },
      ]

      prismaService.conversationMember.findFirst.mockResolvedValue(mockMember)
      prismaService.message.findMany.mockResolvedValue(mockMessages)
      prismaService.message.count.mockResolvedValue(1)

      const options: MessageSearchOptions = {
        conversationId: 'conv-1',
        userId: 'user-1',
        query: 'hello',
        limit: 50,
        offset: 0,
      }

      const result = await service.searchMessages(options)

      expect(result.messages).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
      expect(result.searchTime).toBeGreaterThanOrEqual(0)

      expect(prismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          isDeleted: false,
          content: {
            contains: 'hello',
            mode: 'insensitive',
          },
        },
        include: expect.any(Object),
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: 50,
        skip: 0,
      })
    })

    it('should search across all user conversations when no conversationId provided', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-2',
          content: 'Hello from conversation 1',
          sender: mockUser2,
          conversation: mockConversation,
          attachments: [],
          _count: { receipts: 0 },
        },
        {
          id: 'msg-2',
          conversationId: 'conv-2',
          senderId: 'user-1',
          content: 'Hello from conversation 2',
          sender: mockUser1,
          conversation: { id: 'conv-2', type: 'GROUP', title: 'Test Group' },
          attachments: [],
          _count: { receipts: 0 },
        },
      ]

      prismaService.message.findMany.mockResolvedValue(mockMessages)
      prismaService.message.count.mockResolvedValue(2)

      const options: MessageSearchOptions = {
        userId: 'user-1',
        query: 'hello',
        limit: 50,
        offset: 0,
      }

      const result = await service.searchMessages(options)

      expect(result.messages).toHaveLength(2)
      expect(result.total).toBe(2)

      expect(prismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
          content: {
            contains: 'hello',
            mode: 'insensitive',
          },
          conversation: {
            members: {
              some: {
                userId: 'user-1',
                isActive: true,
              },
            },
          },
        },
        include: expect.any(Object),
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: 50,
        skip: 0,
      })
    })

    it('should apply date range filters', async () => {
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')

      prismaService.message.findMany.mockResolvedValue([])
      prismaService.message.count.mockResolvedValue(0)

      const options: MessageSearchOptions = {
        userId: 'user-1',
        query: 'test',
        dateFrom,
        dateTo,
      }

      await service.searchMessages(options)

      expect(prismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
          content: {
            contains: 'test',
            mode: 'insensitive',
          },
          conversation: {
            members: {
              some: {
                userId: 'user-1',
                isActive: true,
              },
            },
          },
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        include: expect.any(Object),
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: 50,
        skip: 0,
      })
    })

    it('should apply message type filters', async () => {
      prismaService.message.findMany.mockResolvedValue([])
      prismaService.message.count.mockResolvedValue(0)

      const options: MessageSearchOptions = {
        userId: 'user-1',
        query: 'test',
        messageType: ['TEXT', 'IMAGE'],
      }

      await service.searchMessages(options)

      expect(prismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
          content: {
            contains: 'test',
            mode: 'insensitive',
          },
          conversation: {
            members: {
              some: {
                userId: 'user-1',
                isActive: true,
              },
            },
          },
          type: {
            in: ['TEXT', 'IMAGE'],
          },
        },
        include: expect.any(Object),
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: 50,
        skip: 0,
      })
    })

    it('should throw error if user is not a conversation member', async () => {
      prismaService.conversationMember.findFirst.mockResolvedValue(null)

      const options: MessageSearchOptions = {
        conversationId: 'conv-1',
        userId: 'user-1',
        query: 'test',
      }

      await expect(service.searchMessages(options)).rejects.toThrow(
        'User is not a member of this conversation'
      )
    })

    it('should calculate hasMore correctly', async () => {
      prismaService.conversationMember.findFirst.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
        isActive: true,
      })
      prismaService.message.findMany.mockResolvedValue([{ id: 'msg-1' }, { id: 'msg-2' }])
      prismaService.message.count.mockResolvedValue(100)

      const options: MessageSearchOptions = {
        conversationId: 'conv-1',
        userId: 'user-1',
        query: 'test',
        limit: 2,
        offset: 0,
      }

      const result = await service.searchMessages(options)

      expect(result.hasMore).toBe(true)
      expect(result.total).toBe(100)
    })
  })

  describe('prepareMessageForIndexing', () => {
    it('should prepare message document for search indexing', () => {
      const message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: MessageType.TEXT,
        content: 'Hello, World! This is a test message.',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        replyToId: 'reply-msg-1',
        sender: mockUser1,
        replyTo: {
          id: 'reply-msg-1',
          content: 'Original message content',
          sender: mockUser2,
        },
        attachments: [
          {
            id: 'att-1',
            mimeType: 'image/jpeg',
            fileName: 'test.jpg',
            objectKey: 'key1',
            sizeBytes: 1024,
            width: 800,
            height: 600,
            durationMs: null,
            thumbnailKey: 'thumb1',
          },
        ],
      } as any

      const result = service.prepareMessageForIndexing(message)

      expect(result).toEqual({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderUsername: 'testuser1',
        senderName: 'Test User 1',
        content: 'hello world this is a test message',
        type: MessageType.TEXT,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        hasAttachments: true,
        attachmentTypes: ['image/jpeg'],
        isReply: true,
        replyToContent: 'Original message content',
      })
    })

    it('should handle message without attachments or reply', () => {
      const message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: MessageType.TEXT,
        content: 'Simple message',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        replyToId: null,
        sender: mockUser1,
        replyTo: null,
        attachments: [],
      } as any

      const result = service.prepareMessageForIndexing(message)

      expect(result.hasAttachments).toBe(false)
      expect(result.attachmentTypes).toEqual([])
      expect(result.isReply).toBe(false)
      expect(result.replyToContent).toBeUndefined()
    })
  })

  describe('getSearchSuggestions', () => {
    it('should return empty array for short queries', async () => {
      const result = await service.getSearchSuggestions('user-1', 'h')
      expect(result).toEqual([])
    })

    it('should return search suggestions based on message history', async () => {
      const mockMessages = [
        { content: 'hello world how are you' },
        { content: 'help me with this problem' },
        { content: 'health check status' },
        { content: 'helicopter landing' },
      ]

      prismaService.message.findMany.mockResolvedValue(mockMessages)

      const result = await service.getSearchSuggestions('user-1', 'hel', 3)

      expect(result).toContain('hello')
      expect(result).toContain('help')
      expect(result.length).toBeLessThanOrEqual(3)
      // Note: 'health' and 'helicopter' may not be included due to limit

      expect(prismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          conversation: {
            members: {
              some: {
                userId: 'user-1',
                isActive: true,
              },
            },
          },
          isDeleted: false,
          content: {
            contains: 'hel',
            mode: 'insensitive',
          },
        },
        select: {
          content: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      })
    })

    it('should filter out duplicate suggestions', async () => {
      const mockMessages = [
        { content: 'hello world' },
        { content: 'hello again' },
        { content: 'hello there' },
      ]

      prismaService.message.findMany.mockResolvedValue(mockMessages)

      const result = await service.getSearchSuggestions('user-1', 'hel')

      // Should only contain 'hello' once
      const helloCount = result.filter(s => s === 'hello').length
      expect(helloCount).toBeLessThanOrEqual(1)
    })

    it('should handle special characters in content', async () => {
      const mockMessages = [
        { content: 'hello! world?' },
        { content: 'help@example.com' },
        { content: 'health-check' },
      ]

      prismaService.message.findMany.mockResolvedValue(mockMessages)

      const result = await service.getSearchSuggestions('user-1', 'hel')

      expect(result).toContain('hello')
      // Note: Other suggestions may vary based on normalization
    })
  })

  describe('normalizeContent', () => {
    it('should normalize content correctly', () => {
      const content = 'Hello, World! This is a TEST message with @mentions and #hashtags.'
      const normalized = (service as any).normalizeContent(content)

      expect(normalized).toBe('hello world this is a test message with mentions and hashtags')
    })

    it('should handle multiple spaces and special characters', () => {
      const content = 'Multiple   spaces    and\t\ttabs\n\nnewlines!!!'
      const normalized = (service as any).normalizeContent(content)

      expect(normalized).toBe('multiple spaces and tabs newlines')
    })

    it('should handle empty and whitespace-only content', () => {
      expect((service as any).normalizeContent('')).toBe('')
      expect((service as any).normalizeContent('   \t\n   ')).toBe('')
    })
  })
})