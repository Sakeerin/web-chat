import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'
import { MessagesService } from './messages.service'
import { MessageSearchService } from './search/message-search.service'
import { MessageDeliveryService } from './delivery/message-delivery.service'
import { PrismaService } from '../database/prisma.service'
import { MessageType } from '@prisma/client'
import { ulid } from 'ulid'

// Mock ulid
jest.mock('ulid', () => ({
  ulid: jest.fn(() => '01HKQM7X8YZABCDEFGHIJKLMNO'),
}))

describe('MessagesService Unit Tests', () => {
  let service: MessagesService
  let prismaService: any

  beforeEach(async () => {
    const mockPrismaService = {
      conversationMember: {
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
      conversation: {
        update: jest.fn(),
      },
      messageEdit: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      messageReceipt: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
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
          useValue: mockPrismaService,
        },
        {
          provide: MessageSearchService,
          useValue: {
            searchMessages: jest.fn(),
            getSearchSuggestions: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<MessagesService>(MessagesService)
    prismaService = module.get(PrismaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createMessage', () => {
    it('should generate ULID for message ID', async () => {
      const mockConversationMember = {
        id: 'member-1',
        conversationId: 'conv-1',
        userId: 'user-1',
        isActive: true,
      }

      const mockCreatedMessage = {
        id: '01HKQM7X8YZABCDEFGHIJKLMNO',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: MessageType.TEXT,
        content: 'Hello world',
        sender: { id: 'user-1', username: 'test', name: 'Test' },
        attachments: [],
        edits: [],
        _count: { receipts: 0 },
      }

      prismaService.conversationMember.findFirst.mockResolvedValue(mockConversationMember)
      prismaService.message.create.mockResolvedValue(mockCreatedMessage)
      prismaService.conversation.update.mockResolvedValue({})

      const input = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: MessageType.TEXT,
        content: 'Hello world',
      }

      const result = await service.createMessage(input)

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          id: '01HKQM7X8YZABCDEFGHIJKLMNO',
          conversationId: 'conv-1',
          senderId: 'user-1',
          type: MessageType.TEXT,
          content: 'Hello world',
          replyToId: undefined,
          metadata: {},
        },
        include: expect.any(Object),
      })

      expect(result.id).toBe('01HKQM7X8YZABCDEFGHIJKLMNO')
    })

    it('should throw ForbiddenException if user is not a conversation member', async () => {
      prismaService.conversationMember.findFirst.mockResolvedValue(null)

      const input = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: MessageType.TEXT,
        content: 'Hello world',
      }

      await expect(service.createMessage(input)).rejects.toThrow(ForbiddenException)
      expect(prismaService.conversationMember.findFirst).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          userId: 'user-1',
          isActive: true,
        },
      })
    })

    it('should validate reply-to message exists', async () => {
      const mockConversationMember = { id: 'member-1', isActive: true }
      
      prismaService.conversationMember.findFirst.mockResolvedValue(mockConversationMember)
      prismaService.message.findFirst.mockResolvedValue(null)

      const input = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: MessageType.TEXT,
        content: 'Hello world',
        replyToId: 'non-existent-msg',
      }

      await expect(service.createMessage(input)).rejects.toThrow(BadRequestException)
    })
  })

  describe('editMessage', () => {
    it('should throw BadRequestException if content is the same', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Hello world',
        senderId: 'user-1',
        isDeleted: false,
      }

      prismaService.message.findFirst.mockResolvedValue(mockMessage)

      const updateData = { content: 'Hello world' } // Same content

      await expect(service.editMessage('msg-1', 'user-1', updateData)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw NotFoundException if message not found or user is not sender', async () => {
      prismaService.message.findFirst.mockResolvedValue(null)

      const updateData = { content: 'Updated content' }

      await expect(service.editMessage('msg-1', 'user-1', updateData)).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('deleteMessage', () => {
    it('should soft delete message with tombstone content', async () => {
      const mockMessage = {
        id: 'msg-1',
        senderId: 'user-1',
        isDeleted: false,
      }

      prismaService.message.findFirst.mockResolvedValue(mockMessage)
      prismaService.message.update.mockResolvedValue({})

      await service.deleteMessage('msg-1', 'user-1')

      expect(prismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          content: '[This message was deleted]',
        },
      })
    })

    it('should throw NotFoundException if message not found or user is not sender', async () => {
      prismaService.message.findFirst.mockResolvedValue(null)

      await expect(service.deleteMessage('msg-1', 'user-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getUnreadCount', () => {
    it('should return 0 if user is not a conversation member', async () => {
      prismaService.conversationMember.findFirst.mockResolvedValue(null)

      const result = await service.getUnreadCount('conv-1', 'user-1')

      expect(result).toBe(0)
    })

    it('should count messages after last read message', async () => {
      const mockMember = {
        conversationId: 'conv-1',
        userId: 'user-1',
        lastReadMessageId: 'last-read-msg',
        isActive: true,
      }

      prismaService.conversationMember.findFirst.mockResolvedValue(mockMember)
      prismaService.message.count.mockResolvedValue(5)

      const result = await service.getUnreadCount('conv-1', 'user-1')

      expect(prismaService.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          isDeleted: false,
          senderId: { not: 'user-1' },
          id: { gt: 'last-read-msg' },
        },
      })
      expect(result).toBe(5)
    })
  })

  describe('cursor-based pagination logic', () => {
    it('should build correct where clause with cursor', async () => {
      const mockMember = { conversationId: 'conv-1', userId: 'user-1', isActive: true }
      
      prismaService.conversationMember.findFirst.mockResolvedValue(mockMember)
      prismaService.message.findMany.mockResolvedValue([])
      prismaService.message.count.mockResolvedValue(0)

      await service.getMessages('conv-1', 'user-1', { cursor: 'cursor-msg-id', limit: 50 })

      expect(prismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          isDeleted: false,
          id: { lt: 'cursor-msg-id' },
        },
        include: expect.any(Object),
        orderBy: { id: 'desc' },
        take: 51, // limit + 1 to check for more
      })
    })

    it('should detect hasMore correctly when there are more messages', async () => {
      const mockMember = { conversationId: 'conv-1', userId: 'user-1', isActive: true }
      const mockMessages = Array(51).fill({ id: 'msg-1' }) // 51 messages (limit + 1)
      
      prismaService.conversationMember.findFirst.mockResolvedValue(mockMember)
      prismaService.message.findMany.mockResolvedValue(mockMessages)
      prismaService.message.count.mockResolvedValue(100)

      const result = await service.getMessages('conv-1', 'user-1', { limit: 50 })

      expect(result.messages).toHaveLength(50) // Should remove the extra message
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe('msg-1')
    })
  })
})