import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { SearchModule } from './search.module'
import { DatabaseModule } from '../database/database.module'
import { PrismaService } from '../database/prisma.service'
import { MeiliSearchService } from './meilisearch.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ConfigModule } from '@nestjs/config'

describe('Search Integration', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let meilisearchService: MeiliSearchService

  const mockUser = {
    id: 'user_123',
    username: 'testuser',
    email: 'test@example.com',
  }

  // Mock MeiliSearch to avoid external dependencies in tests
  const mockMeiliSearchService = {
    onModuleInit: jest.fn(),
    searchMessages: jest.fn(),
    searchUsers: jest.fn(),
    searchConversations: jest.fn(),
    indexMessage: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
    indexUser: jest.fn(),
    indexConversation: jest.fn(),
    getIndexStats: jest.fn(),
    clearIndex: jest.fn(),
    messagesIndex: {
      addDocuments: jest.fn(),
    },
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseModule,
        SearchModule,
      ],
    })
      .overrideProvider(MeiliSearchService)
      .useValue(mockMeiliSearchService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest()
          request.user = mockUser
          return true
        },
      })
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    prismaService = moduleFixture.get<PrismaService>(PrismaService)
    meilisearchService = moduleFixture.get<MeiliSearchService>(MeiliSearchService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    jest.clearAllMocks()
  })

  describe('GET /search/messages', () => {
    it('should search messages successfully', async () => {
      const searchResult = {
        hits: [
          {
            id: 'msg_123',
            content: 'Hello world',
            senderId: 'user_456',
            senderName: 'John Doe',
            conversationId: 'conv_123',
            createdAt: 1640995200,
            hasAttachments: false,
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

      mockMeiliSearchService.searchMessages.mockResolvedValue(searchResult)

      // Mock user is member of conversation
      jest.spyOn(prismaService.conversationMember, 'findMany').mockResolvedValue([
        { 
          id: 'member_1',
          conversationId: 'conv_123',
          userId: 'user_123',
          role: 'member',
          permissions: {},
          joinedAt: new Date(),
          leftAt: null,
          isActive: true,
          isMuted: false,
          mutedUntil: null,
          lastReadAt: null,
        } as any,
      ])

      const response = await request(app.getHttpServer())
        .get('/search/messages')
        .query({ q: 'hello' })
        .expect(200)

      expect(response.body).toEqual(searchResult)
      expect(mockMeiliSearchService.searchMessages).toHaveBeenCalledWith({
        query: 'hello',
        filters: ['(conversationId = "conv_123")'],
        limit: 50,
        offset: 0,
        sort: ['createdAt:desc'],
        attributesToHighlight: ['content', 'senderName'],
        attributesToCrop: ['content'],
        cropLength: 200,
      })
    })

    it('should validate query parameters', async () => {
      await request(app.getHttpServer())
        .get('/search/messages')
        .query({ q: '' }) // Empty query
        .expect(400)
    })

    it('should validate limit parameter', async () => {
      await request(app.getHttpServer())
        .get('/search/messages')
        .query({ q: 'hello', limit: 200 }) // Exceeds max
        .expect(400)
    })

    it('should search with filters', async () => {
      mockMeiliSearchService.searchMessages.mockResolvedValue({
        hits: [],
        query: 'hello',
        processingTimeMs: 5,
        limit: 25,
        offset: 10,
        estimatedTotalHits: 0,
      })

      jest.spyOn(prismaService.conversationMember, 'findFirst').mockResolvedValue({
        id: 'member_1',
        userId: 'user_123',
        conversationId: 'conv_123',
        role: 'member',
        permissions: {},
        joinedAt: new Date(),
        leftAt: null,
        isActive: true,
        isMuted: false,
        mutedUntil: null,
        lastReadAt: null,
      } as any)

      await request(app.getHttpServer())
        .get('/search/messages')
        .query({
          q: 'hello',
          conversationId: 'conv_123',
          limit: 25,
          offset: 10,
          dateFrom: '2023-01-01T00:00:00Z',
          dateTo: '2023-12-31T23:59:59Z',
          messageTypes: 'text,image',
          hasAttachments: 'true',
        })
        .expect(200)

      expect(mockMeiliSearchService.searchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'hello',
          filters: expect.arrayContaining([
            'conversationId = "conv_123"',
            'createdAt >= 1672531200',
            'createdAt <= 1704067199',
            '(type = "text" OR type = "image")',
            'hasAttachments = true',
          ]),
          limit: 25,
          offset: 10,
        })
      )
    })
  })

  describe('GET /search/users', () => {
    it('should search users successfully', async () => {
      const searchResult = {
        hits: [
          {
            id: 'user_456',
            username: 'john_doe',
            name: 'John Doe',
            bio: 'Software developer',
            isActive: true,
            _formatted: {
              username: '<em>john</em>_doe',
              name: '<em>John</em> Doe',
            },
          },
        ],
        query: 'john',
        processingTimeMs: 3,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 1,
      }

      mockMeiliSearchService.searchUsers.mockResolvedValue(searchResult)

      // Mock no blocked users
      jest.spyOn(prismaService.userContact, 'findMany').mockResolvedValue([])

      const response = await request(app.getHttpServer())
        .get('/search/users')
        .query({ q: 'john' })
        .expect(200)

      expect(response.body).toEqual(searchResult)
      expect(mockMeiliSearchService.searchUsers).toHaveBeenCalledWith({
        query: 'john',
        filters: ['isActive = true'],
        limit: 20,
        offset: 0,
        sort: ['username:asc'],
        attributesToHighlight: ['username', 'name'],
      })
    })

    it('should exclude blocked users', async () => {
      mockMeiliSearchService.searchUsers.mockResolvedValue({
        hits: [],
        query: 'john',
        processingTimeMs: 3,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 0,
      })

      // Mock blocked users
      jest.spyOn(prismaService.userContact, 'findMany').mockResolvedValue([
        { 
          id: 'contact_1',
          userId: 'user_123',
          contactUserId: 'blocked_user_1',
          status: 'blocked',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        { 
          id: 'contact_2',
          userId: 'user_123',
          contactUserId: 'blocked_user_2',
          status: 'blocked',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ])

      await request(app.getHttpServer())
        .get('/search/users')
        .query({ q: 'john', excludeBlocked: 'true' })
        .expect(200)

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
    })
  })

  describe('GET /search/conversations', () => {
    it('should search conversations successfully', async () => {
      const searchResult = {
        hits: [
          {
            id: 'conv_123',
            title: 'Project Team',
            type: 'group',
            memberNames: 'John Doe Jane Smith',
            createdAt: 1640995200,
            _formatted: {
              title: '<em>Project</em> Team',
            },
          },
        ],
        query: 'project',
        processingTimeMs: 4,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 1,
      }

      mockMeiliSearchService.searchConversations.mockResolvedValue(searchResult)

      // Mock user conversations
      jest.spyOn(prismaService.conversationMember, 'findMany').mockResolvedValue([
        { conversationId: 'conv_123' },
        { conversationId: 'conv_456' },
      ])

      const response = await request(app.getHttpServer())
        .get('/search/conversations')
        .query({ q: 'project' })
        .expect(200)

      expect(response.body).toEqual(searchResult)
      expect(mockMeiliSearchService.searchConversations).toHaveBeenCalledWith({
        query: 'project',
        filters: [
          '(id = "conv_123" OR id = "conv_456")',
          'isActive = true',
        ],
        limit: 20,
        offset: 0,
        sort: ['updatedAt:desc'],
        attributesToHighlight: ['title', 'memberNames'],
      })
    })

    it('should filter by conversation type', async () => {
      mockMeiliSearchService.searchConversations.mockResolvedValue({
        hits: [],
        query: 'project',
        processingTimeMs: 4,
        limit: 20,
        offset: 0,
        estimatedTotalHits: 0,
      })

      jest.spyOn(prismaService.conversationMember, 'findMany').mockResolvedValue([
        { conversationId: 'conv_123' },
      ])

      await request(app.getHttpServer())
        .get('/search/conversations')
        .query({ q: 'project', type: 'group' })
        .expect(200)

      expect(mockMeiliSearchService.searchConversations).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining(['type = "group"']),
        })
      )
    })
  })

  describe('GET /search/suggestions', () => {
    it('should get search suggestions', async () => {
      const suggestions = [
        { text: 'hello', type: 'recent' },
        { text: 'help', type: 'recent' },
        { text: 'hello_user', type: 'contact', metadata: { userId: 'user_456' } },
      ]

      // Mock message history
      jest.spyOn(prismaService.message, 'findMany').mockResolvedValue([
        { content: 'hello world how are you' },
        { content: 'help me with this task' },
      ])

      // Mock contacts
      jest.spyOn(prismaService.contact, 'findMany').mockResolvedValue([
        {
          contactUser: {
            id: 'user_456',
            username: 'hello_user',
            name: 'Hello User',
          },
        },
      ])

      const response = await request(app.getHttpServer())
        .get('/search/suggestions')
        .query({ q: 'hel', limit: 3 })
        .expect(200)

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'hello', type: 'recent' }),
          expect.objectContaining({ text: 'help', type: 'recent' }),
          expect.objectContaining({ 
            text: 'hello_user', 
            type: 'contact',
            metadata: { userId: 'user_456', name: 'Hello User' }
          }),
        ])
      )
    })

    it('should return empty array for short queries', async () => {
      const response = await request(app.getHttpServer())
        .get('/search/suggestions')
        .query({ q: 'a' })
        .expect(200)

      expect(response.body).toEqual([])
    })
  })

  describe('GET /search/stats', () => {
    it('should get search statistics', async () => {
      const stats = {
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

      mockMeiliSearchService.getIndexStats.mockResolvedValue(stats)

      const response = await request(app.getHttpServer())
        .get('/search/stats')
        .expect(200)

      expect(response.body).toEqual(stats)
    })
  })

  describe('POST /search/reindex/messages', () => {
    it('should trigger message re-indexing', async () => {
      mockMeiliSearchService.messagesIndex.addDocuments.mockResolvedValue({ taskUid: 1 })

      // Mock empty message results to end the bulk indexing quickly
      jest.spyOn(prismaService.message, 'findMany').mockResolvedValue([])

      const response = await request(app.getHttpServer())
        .post('/search/reindex/messages')
        .expect(202)

      expect(response.body).toEqual({ message: 'Message re-indexing started' })
    })
  })

  describe('POST /search/index/message/:messageId', () => {
    it('should index a specific message', async () => {
      const message = {
        id: 'msg_123',
        conversationId: 'conv_123',
        senderId: 'user_123',
        content: 'Hello world',
        type: 'text',
        createdAt: new Date(),
        isDeleted: false,
        replyToId: null,
        sender: {
          id: 'user_123',
          username: 'john_doe',
          name: 'John Doe',
        },
        attachments: [],
        replyTo: null,
      }

      jest.spyOn(prismaService.message, 'findUnique').mockResolvedValue(message)
      mockMeiliSearchService.indexMessage.mockResolvedValue(undefined)

      const response = await request(app.getHttpServer())
        .post('/search/index/message/msg_123')
        .expect(202)

      expect(response.body).toEqual({ message: 'Message indexed successfully' })
      expect(mockMeiliSearchService.indexMessage).toHaveBeenCalled()
    })
  })

  describe('POST /search/index/user/:userId', () => {
    it('should index a specific user', async () => {
      const user = {
        id: 'user_123',
        username: 'john_doe',
        name: 'John Doe',
        bio: 'Software developer',
        avatarUrl: null,
        createdAt: new Date(),
        isActive: true,
      }

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(user)
      mockMeiliSearchService.indexUser.mockResolvedValue(undefined)

      const response = await request(app.getHttpServer())
        .post('/search/index/user/user_123')
        .expect(202)

      expect(response.body).toEqual({ message: 'User indexed successfully' })
      expect(mockMeiliSearchService.indexUser).toHaveBeenCalled()
    })
  })

  describe('POST /search/index/conversation/:conversationId', () => {
    it('should index a specific conversation', async () => {
      const conversation = {
        id: 'conv_123',
        type: 'group',
        title: 'Project Team',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            userId: 'user_1',
            isActive: true,
            user: {
              id: 'user_1',
              username: 'john_doe',
              name: 'John Doe',
            },
          },
          {
            userId: 'user_2',
            isActive: true,
            user: {
              id: 'user_2',
              username: 'jane_smith',
              name: 'Jane Smith',
            },
          },
        ],
      }

      jest.spyOn(prismaService.conversation, 'findUnique').mockResolvedValue(conversation)
      mockMeiliSearchService.indexConversation.mockResolvedValue(undefined)

      const response = await request(app.getHttpServer())
        .post('/search/index/conversation/conv_123')
        .expect(202)

      expect(response.body).toEqual({ message: 'Conversation indexed successfully' })
      expect(mockMeiliSearchService.indexConversation).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle search service errors', async () => {
      mockMeiliSearchService.searchMessages.mockRejectedValue(new Error('Search service unavailable'))

      jest.spyOn(prismaService.conversationMember, 'findMany').mockResolvedValue([
        { conversationId: 'conv_123' },
      ])

      await request(app.getHttpServer())
        .get('/search/messages')
        .query({ q: 'hello' })
        .expect(500)
    })

    it('should handle unauthorized conversation access', async () => {
      jest.spyOn(prismaService.conversationMember, 'findFirst').mockResolvedValue(null)

      await request(app.getHttpServer())
        .get('/search/messages')
        .query({ q: 'hello', conversationId: 'conv_unauthorized' })
        .expect(500) // This would be handled by the service throwing an error
    })
  })
})