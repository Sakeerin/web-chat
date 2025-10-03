import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { MessagesService } from './messages.service'
import { MessageSearchService } from './search/message-search.service'
import { MessageDeliveryService } from './delivery/message-delivery.service'
import { PrismaService } from '../database/prisma.service'
import { MessageType } from '@prisma/client'
import { ulid } from 'ulid'

describe('Messages Integration Tests', () => {
  let app: INestApplication
  let messagesService: MessagesService
  let messageSearchService: MessageSearchService
  let prismaService: PrismaService

  // Test data
  const testUser1 = {
    id: 'user-1',
    username: 'testuser1',
    email: 'test1@example.com',
    name: 'Test User 1',
    passwordHash: 'hash1',
    salt: 'salt1',
  }

  const testUser2 = {
    id: 'user-2',
    username: 'testuser2',
    email: 'test2@example.com',
    name: 'Test User 2',
    passwordHash: 'hash2',
    salt: 'salt2',
  }

  const testConversation = {
    id: 'conv-1',
    type: 'DM' as const,
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        MessageSearchService,
        {
          provide: MessageDeliveryService,
          useValue: {
            deliverMessage: jest.fn(),
            markMessageAsRead: jest.fn(),
            getMessageDeliveryState: jest.fn(),
            backfillMessages: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
            conversation: {
              create: jest.fn(),
              update: jest.fn(),
            },
            conversationMember: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            message: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            messageEdit: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            messageReceipt: {
              upsert: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    messagesService = moduleFixture.get<MessagesService>(MessagesService)
    messageSearchService = moduleFixture.get<MessageSearchService>(MessageSearchService)
    prismaService = moduleFixture.get<PrismaService>(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Message CRUD Operations', () => {
    describe('createMessage', () => {
      it('should create a message with ULID generation', async () => {
        const mockConversationMember = {
          id: 'member-1',
          conversationId: testConversation.id,
          userId: testUser1.id,
          isActive: true,
        }

        const mockCreatedMessage = {
          id: ulid(),
          conversationId: testConversation.id,
          senderId: testUser1.id,
          type: MessageType.TEXT,
          content: 'Hello world',
          metadata: {},
          replyToId: null,
          isEdited: false,
          isDeleted: false,
          deletedAt: null,
          createdAt: new Date(),
          editedAt: null,
          sender: {
            id: testUser1.id,
            username: testUser1.username,
            name: testUser1.name,
            avatarUrl: null,
          },
          replyTo: null,
          attachments: [],
          edits: [],
          _count: { receipts: 0 },
        }

        ;(prismaService.conversationMember.findFirst as jest.Mock).mockResolvedValue(mockConversationMember)
        ;(prismaService.message.create as jest.Mock).mockResolvedValue(mockCreatedMessage)
        ;(prismaService.conversation.update as jest.Mock).mockResolvedValue({})

        const input = {
          conversationId: testConversation.id,
          senderId: testUser1.id,
          type: MessageType.TEXT,
          content: 'Hello world',
        }

        const result = await messagesService.createMessage(input)

        expect(result.id).toBeDefined()
        expect(result.content).toBe('Hello world')
        expect(result.senderId).toBe(testUser1.id)
        expect(prismaService.message.create).toHaveBeenCalledWith({
          data: {
            id: expect.any(String),
            conversationId: testConversation.id,
            senderId: testUser1.id,
            type: MessageType.TEXT,
            content: 'Hello world',
            replyToId: undefined,
            metadata: {},
          },
          include: expect.any(Object),
        })
      })

      it('should handle reply messages correctly', async () => {
        const mockConversationMember = { id: 'member-1', isActive: true }
        const mockReplyToMessage = {
          id: 'original-msg',
          conversationId: testConversation.id,
          isDeleted: false,
        }
        const mockCreatedMessage = {
          id: ulid(),
          replyToId: 'original-msg',
          content: 'This is a reply',
          sender: { id: testUser1.id, username: testUser1.username, name: testUser1.name },
          replyTo: {
            id: 'original-msg',
            content: 'Original message',
            sender: { id: testUser2.id, username: testUser2.username, name: testUser2.name },
          },
          attachments: [],
          edits: [],
          _count: { receipts: 0 },
        }

        ;(prismaService.conversationMember.findFirst as jest.Mock).mockResolvedValue(mockConversationMember)
        ;(prismaService.message.findFirst as jest.Mock).mockResolvedValue(mockReplyToMessage)
        ;(prismaService.message.create as jest.Mock).mockResolvedValue(mockCreatedMessage)
        ;(prismaService.conversation.update as jest.Mock).mockResolvedValue({})

        const input = {
          conversationId: testConversation.id,
          senderId: testUser1.id,
          type: MessageType.TEXT,
          content: 'This is a reply',
          replyToId: 'original-msg',
        }

        const result = await messagesService.createMessage(input)

        expect(result.replyToId).toBe('original-msg')
        expect(result.replyTo).toBeDefined()
        expect(prismaService.message.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'original-msg',
            conversationId: testConversation.id,
            isDeleted: false,
          },
        })
      })
    })

    describe('editMessage', () => {
      it('should edit message and create edit history', async () => {
        const originalMessage = {
          id: 'msg-1',
          content: 'Original content',
          senderId: testUser1.id,
          isDeleted: false,
        }

        const updatedMessage = {
          ...originalMessage,
          content: 'Updated content',
          isEdited: true,
          editedAt: new Date(),
          sender: { id: testUser1.id, username: testUser1.username, name: testUser1.name },
          attachments: [],
          edits: [],
          _count: { receipts: 0 },
        }

        ;(prismaService.message.findFirst as jest.Mock).mockResolvedValue(originalMessage)
        ;(prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
          return callback({
            messageEdit: {
              create: jest.fn().mockResolvedValue({}),
            },
            message: {
              update: jest.fn().mockResolvedValue(updatedMessage),
            },
          })
        })

        const result = await messagesService.editMessage('msg-1', testUser1.id, {
          content: 'Updated content',
        })

        expect(result.content).toBe('Updated content')
        expect(result.isEdited).toBe(true)
        expect(prismaService.$transaction).toHaveBeenCalled()
      })

      it('should prevent editing with same content', async () => {
        const message = {
          id: 'msg-1',
          content: 'Same content',
          senderId: testUser1.id,
          isDeleted: false,
        }

        ;(prismaService.message.findFirst as jest.Mock).mockResolvedValue(message)

        await expect(
          messagesService.editMessage('msg-1', testUser1.id, { content: 'Same content' })
        ).rejects.toThrow('New content is the same as current content')
      })
    })

    describe('deleteMessage', () => {
      it('should soft delete message with tombstone', async () => {
        const message = {
          id: 'msg-1',
          senderId: testUser1.id,
          isDeleted: false,
        }

        ;(prismaService.message.findFirst as jest.Mock).mockResolvedValue(message)
        ;(prismaService.message.update as jest.Mock).mockResolvedValue({})

        await messagesService.deleteMessage('msg-1', testUser1.id)

        expect(prismaService.message.update).toHaveBeenCalledWith({
          where: { id: 'msg-1' },
          data: {
            isDeleted: true,
            deletedAt: expect.any(Date),
            content: '[This message was deleted]',
          },
        })
      })
    })

    describe('getMessages with cursor-based pagination', () => {
      it('should retrieve messages with proper pagination', async () => {
        const mockMember = { conversationId: testConversation.id, userId: testUser1.id, isActive: true }
        const mockMessages = [
          { id: 'msg-3', content: 'Message 3', createdAt: new Date('2024-01-03') },
          { id: 'msg-2', content: 'Message 2', createdAt: new Date('2024-01-02') },
          { id: 'msg-1', content: 'Message 1', createdAt: new Date('2024-01-01') },
        ]

        ;(prismaService.conversationMember.findFirst as jest.Mock).mockResolvedValue(mockMember)
        ;(prismaService.message.findMany as jest.Mock).mockResolvedValue(mockMessages)
        ;(prismaService.message.count as jest.Mock).mockResolvedValue(3)

        const result = await messagesService.getMessages(testConversation.id, testUser1.id, {
          limit: 50,
        })

        expect(result.messages).toHaveLength(3)
        expect(result.total).toBe(3)
        expect(result.hasMore).toBe(false)
        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: {
            conversationId: testConversation.id,
            isDeleted: false,
          },
          include: expect.any(Object),
          orderBy: { id: 'desc' },
          take: 51, // limit + 1
        })
      })

      it('should handle cursor-based pagination correctly', async () => {
        const mockMember = { conversationId: testConversation.id, userId: testUser1.id, isActive: true }
        const mockMessages = Array(51).fill({ id: 'msg-1' }) // More than limit

        ;(prismaService.conversationMember.findFirst as jest.Mock).mockResolvedValue(mockMember)
        ;(prismaService.message.findMany as jest.Mock).mockResolvedValue(mockMessages)
        ;(prismaService.message.count as jest.Mock).mockResolvedValue(100)

        const result = await messagesService.getMessages(testConversation.id, testUser1.id, {
          cursor: 'cursor-msg-id',
          limit: 50,
        })

        expect(result.messages).toHaveLength(50) // Should remove extra message
        expect(result.hasMore).toBe(true)
        expect(result.nextCursor).toBe('msg-1')
        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: {
            conversationId: testConversation.id,
            isDeleted: false,
            id: { lt: 'cursor-msg-id' },
          },
          include: expect.any(Object),
          orderBy: { id: 'desc' },
          take: 51,
        })
      })
    })

    describe('markMessagesAsRead', () => {
      it('should update last read message and create receipt', async () => {
        const mockMember = {
          id: 'member-1',
          conversationId: testConversation.id,
          userId: testUser1.id,
          isActive: true,
        }
        const mockMessage = {
          id: 'msg-1',
          conversationId: testConversation.id,
          isDeleted: false,
        }

        ;(prismaService.conversationMember.findFirst as jest.Mock).mockResolvedValue(mockMember)
        ;(prismaService.message.findFirst as jest.Mock).mockResolvedValue(mockMessage)
        ;(prismaService.conversationMember.update as jest.Mock).mockResolvedValue({})
        ;(prismaService.messageReceipt.upsert as jest.Mock).mockResolvedValue({})

        await messagesService.markMessagesAsRead(testConversation.id, testUser1.id, 'msg-1')

        expect(prismaService.conversationMember.update).toHaveBeenCalledWith({
          where: { id: 'member-1' },
          data: {
            lastReadMessageId: 'msg-1',
            lastReadAt: expect.any(Date),
          },
        })

        expect(prismaService.messageReceipt.upsert).toHaveBeenCalledWith({
          where: {
            messageId_userId_type: {
              messageId: 'msg-1',
              userId: testUser1.id,
              type: 'READ',
            },
          },
          update: { timestamp: expect.any(Date) },
          create: {
            messageId: 'msg-1',
            userId: testUser1.id,
            type: 'READ',
            timestamp: expect.any(Date),
          },
        })
      })
    })

    describe('getUnreadCount', () => {
      it('should calculate unread count correctly', async () => {
        const mockMember = {
          conversationId: testConversation.id,
          userId: testUser1.id,
          lastReadMessageId: 'last-read-msg',
          isActive: true,
        }

        ;(prismaService.conversationMember.findFirst as jest.Mock).mockResolvedValue(mockMember)
        ;(prismaService.message.count as jest.Mock).mockResolvedValue(5)

        const result = await messagesService.getUnreadCount(testConversation.id, testUser1.id)

        expect(result).toBe(5)
        expect(prismaService.message.count).toHaveBeenCalledWith({
          where: {
            conversationId: testConversation.id,
            isDeleted: false,
            senderId: { not: testUser1.id },
            id: { gt: 'last-read-msg' },
          },
        })
      })

      it('should return 0 for non-members', async () => {
        ;(prismaService.conversationMember.findFirst as jest.Mock).mockResolvedValue(null)

        const result = await messagesService.getUnreadCount(testConversation.id, testUser1.id)

        expect(result).toBe(0)
      })
    })
  })

  describe('Message Search Functionality', () => {
    it('should search messages in conversation', async () => {
      const mockSearchResult = {
        messages: [
          {
            id: 'msg-1',
            conversationId: testConversation.id,
            senderId: testUser1.id,
            type: 'TEXT' as const,
            content: 'Hello world',
            metadata: {},
            replyToId: null,
            isEdited: false,
            isDeleted: false,
            deletedAt: null,
            createdAt: new Date(),
            editedAt: null,
            sender: { id: testUser1.id, username: testUser1.username, name: testUser1.name, avatarUrl: undefined },
            replyTo: null,
            attachments: [],
            edits: [],
            _count: { receipts: 0 },
          },
        ],
        total: 1,
        hasMore: false,
        searchTime: 50,
      }

      jest.spyOn(messageSearchService, 'searchMessages').mockResolvedValue(mockSearchResult as any)

      const result = await messagesService.searchMessages(
        testConversation.id,
        testUser1.id,
        'hello',
        50,
        0
      )

      expect(result.messages).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
      expect(messageSearchService.searchMessages).toHaveBeenCalledWith({
        conversationId: testConversation.id,
        userId: testUser1.id,
        query: 'hello',
        limit: 50,
        offset: 0,
      })
    })

    it('should search across all user conversations', async () => {
      const mockSearchResult = {
        messages: [
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: testUser2.id,
            type: 'TEXT' as const,
            content: 'Hello from conversation 1',
            metadata: {},
            replyToId: null,
            isEdited: false,
            isDeleted: false,
            deletedAt: null,
            createdAt: new Date(),
            editedAt: null,
            sender: { id: testUser2.id, username: testUser2.username, name: testUser2.name, avatarUrl: undefined },
            replyTo: null,
            attachments: [],
            edits: [],
            _count: { receipts: 0 },
          },
          {
            id: 'msg-2',
            conversationId: 'conv-2',
            senderId: testUser1.id,
            type: 'TEXT' as const,
            content: 'Hello from conversation 2',
            metadata: {},
            replyToId: null,
            isEdited: false,
            isDeleted: false,
            deletedAt: null,
            createdAt: new Date(),
            editedAt: null,
            sender: { id: testUser1.id, username: testUser1.username, name: testUser1.name, avatarUrl: undefined },
            replyTo: null,
            attachments: [],
            edits: [],
            _count: { receipts: 0 },
          },
        ],
        total: 2,
        hasMore: false,
        searchTime: 75,
      }

      jest.spyOn(messageSearchService, 'searchMessages').mockResolvedValue(mockSearchResult as any)

      const result = await messagesService.searchAllMessages(testUser1.id, 'hello', {
        limit: 50,
        offset: 0,
      })

      expect(result.messages).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(messageSearchService.searchMessages).toHaveBeenCalledWith({
        userId: testUser1.id,
        query: 'hello',
        limit: 50,
        offset: 0,
        dateFrom: undefined,
        dateTo: undefined,
        messageType: undefined,
      })
    })

    it('should get search suggestions', async () => {
      const mockSuggestions = ['hello', 'help', 'health']

      jest.spyOn(messageSearchService, 'getSearchSuggestions').mockResolvedValue(mockSuggestions)

      const result = await messagesService.getSearchSuggestions(testUser1.id, 'hel')

      expect(result).toEqual(mockSuggestions)
      expect(messageSearchService.getSearchSuggestions).toHaveBeenCalledWith(testUser1.id, 'hel')
    })
  })

  describe('Message Edit History', () => {
    it('should retrieve edit history for a message', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId: testConversation.id,
        sender: { id: testUser1.id, username: testUser1.username, name: testUser1.name },
        attachments: [],
        edits: [],
        _count: { receipts: 0 },
      }

      const mockEditHistory = [
        {
          id: 'edit-1',
          previousContent: 'Original content',
          editedAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'edit-2',
          previousContent: 'First edit',
          editedAt: new Date('2024-01-01T11:00:00Z'),
        },
      ]

      ;(prismaService.conversationMember.findFirst as jest.Mock).mockResolvedValue({
        conversationId: testConversation.id,
        userId: testUser1.id,
        isActive: true,
      })
      ;(prismaService.message.findFirst as jest.Mock).mockResolvedValue(mockMessage)
      ;(prismaService.messageEdit.findMany as jest.Mock).mockResolvedValue(mockEditHistory)

      const result = await messagesService.getMessageEditHistory('msg-1', testUser1.id)

      expect(result).toHaveLength(2)
      expect(result[0].previousContent).toBe('Original content')
      expect(result[1].previousContent).toBe('First edit')
      expect(prismaService.messageEdit.findMany).toHaveBeenCalledWith({
        where: { messageId: 'msg-1' },
        orderBy: { editedAt: 'desc' },
      })
    })
  })
})