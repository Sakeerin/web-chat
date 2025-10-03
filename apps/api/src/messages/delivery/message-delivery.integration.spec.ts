import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { WebSocketService } from '../../websocket/websocket.service'
import { MessageDeliveryService } from './message-delivery.service'
import { MessageWithRelations } from '../interfaces/message.interface'

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    lpush: jest.fn(),
    lrange: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    quit: jest.fn(),
  }
  return jest.fn(() => mockRedis)
})

describe('MessageDeliveryService Integration', () => {
  let app: INestApplication
  let deliveryService: MessageDeliveryService
  let prismaService: PrismaService
  let webSocketService: WebSocketService

  const mockUser1 = {
    id: 'user1',
    username: 'testuser1',
    email: 'test1@example.com',
    name: 'Test User 1',
    passwordHash: 'hash',
    salt: 'salt',
    phone: null,
    bio: null,
    avatarUrl: null,
    lastSeenAt: new Date(),
    privacySettings: {},
    isActive: true,
    isOnline: false,
    isVerified: false,
    isSuspended: false,
    suspendedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockUser2 = {
    id: 'user2',
    username: 'testuser2',
    email: 'test2@example.com',
    name: 'Test User 2',
    passwordHash: 'hash',
    salt: 'salt',
    phone: null,
    bio: null,
    avatarUrl: null,
    lastSeenAt: new Date(),
    privacySettings: {},
    isActive: true,
    isOnline: false,
    isVerified: false,
    isSuspended: false,
    suspendedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockMessage: MessageWithRelations = {
    id: 'msg1',
    conversationId: 'conv1',
    senderId: 'user1',
    type: 'TEXT' as const,
    content: 'Test message',
    metadata: {},
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    editedAt: null,
    sender: {
      id: 'user1',
      username: 'testuser1',
      name: 'Test User 1',
      avatarUrl: undefined,
    },
    replyTo: undefined,
    attachments: [],
    edits: [],
    _count: { receipts: 0 },
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        MessageDeliveryService,
        {
          provide: PrismaService,
          useValue: {
            conversationMember: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
              findFirst: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            messageReceipt: {
              upsert: jest.fn(),
            },
            message: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: WebSocketService,
          useValue: {
            isUserOnline: jest.fn(),
            broadcastToUser: jest.fn(),
            getUserSocketIds: jest.fn(),
            sendMessageAckToSocket: jest.fn(),
            broadcastMessageReceipt: jest.fn(),
          },
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    deliveryService = moduleFixture.get<MessageDeliveryService>(MessageDeliveryService)
    prismaService = moduleFixture.get<PrismaService>(PrismaService)
    webSocketService = moduleFixture.get<WebSocketService>(WebSocketService)
  })

  afterEach(async () => {
    await app.close()
  })

  describe('deliverMessage', () => {
    it('should deliver message to online user', async () => {
      // Arrange
      const tempId = 'temp123'
      
      jest.spyOn(prismaService.conversationMember, 'findMany').mockResolvedValue([
        {
          id: 'member2',
          conversationId: 'conv1',
          userId: 'user2',
          role: 'MEMBER' as const,
          permissions: {},
          joinedAt: new Date(),
          leftAt: null,
          isActive: true,
          isMuted: false,
          mutedUntil: null,
          lastReadMessageId: null,
          lastReadAt: null,
        },
      ])
      
      jest.spyOn(webSocketService, 'isUserOnline').mockResolvedValue(true)
      jest.spyOn(webSocketService, 'getUserSocketIds').mockResolvedValue(['socket1'])
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser2,
        privacySettings: { showReadReceipts: true },
      })
      
      // Act
      const result = await deliveryService.deliverMessage(mockMessage, tempId, 'user1')
      
      // Assert
      expect(result.messageId).toBe('msg1')
      expect(result.state).toBe('sent')
      expect(result.deliveredTo).toContain('user2')
      expect(webSocketService.broadcastToUser).toHaveBeenCalledWith('user2', 'message-new', expect.any(Object))
      expect(prismaService.messageReceipt.upsert).toHaveBeenCalledWith({
        where: {
          messageId_userId_type: {
            messageId: 'msg1',
            userId: 'user2',
            type: 'DELIVERED',
          },
        },
        update: expect.any(Object),
        create: expect.objectContaining({
          messageId: 'msg1',
          userId: 'user2',
          type: 'DELIVERED',
        }),
      })
    })

    it('should queue message for offline user', async () => {
      // Arrange
      const tempId = 'temp123'
      
      jest.spyOn(prismaService.conversationMember, 'findMany').mockResolvedValue([
        {
          id: 'member2',
          conversationId: 'conv1',
          userId: 'user2',
          role: 'MEMBER' as const,
          permissions: {},
          joinedAt: new Date(),
          leftAt: null,
          isActive: true,
          isMuted: false,
          mutedUntil: null,
          lastReadMessageId: null,
          lastReadAt: null,
        },
      ])
      
      jest.spyOn(webSocketService, 'isUserOnline').mockResolvedValue(false)
      jest.spyOn(webSocketService, 'getUserSocketIds').mockResolvedValue([])
      
      // Act
      const result = await deliveryService.deliverMessage(mockMessage, tempId, 'user1')
      
      // Assert
      expect(result.messageId).toBe('msg1')
      expect(result.state).toBe('sent')
      expect(result.deliveredTo).toHaveLength(0)
    })
  })

  describe('markMessageAsRead', () => {
    it('should create read receipt when user has read receipts enabled', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser2,
        privacySettings: { sendReadReceipts: true },
      })
      
      // Act
      await deliveryService.markMessageAsRead('msg1', 'user2', 'conv1')
      
      // Assert
      expect(prismaService.messageReceipt.upsert).toHaveBeenCalledWith({
        where: {
          messageId_userId_type: {
            messageId: 'msg1',
            userId: 'user2',
            type: 'READ',
          },
        },
        update: expect.any(Object),
        create: expect.objectContaining({
          messageId: 'msg1',
          userId: 'user2',
          type: 'READ',
        }),
      })
      expect(webSocketService.broadcastMessageReceipt).toHaveBeenCalledWith('conv1', 'msg1', 'user2', 'seen')
    })

    it('should not create read receipt when user has read receipts disabled', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser2,
        privacySettings: { sendReadReceipts: false },
      })
      
      // Act
      await deliveryService.markMessageAsRead('msg1', 'user2', 'conv1')
      
      // Assert
      expect(prismaService.messageReceipt.upsert).not.toHaveBeenCalled()
      expect(webSocketService.broadcastMessageReceipt).not.toHaveBeenCalled()
    })
  })

  describe('getMessageDeliveryState', () => {
    it('should return delivery state with privacy-aware read receipts', async () => {
      // Arrange
      jest.spyOn(prismaService.message, 'findFirst').mockResolvedValue({
        ...mockMessage,
        receipts: [
          {
            id: 'receipt1',
            messageId: 'msg1',
            userId: 'user2',
            type: 'DELIVERED' as const,
            timestamp: new Date(),
            user: {
              id: 'user2',
              username: 'testuser2',
              name: 'Test User 2',
              privacySettings: { showReadReceipts: true },
            },
          },
          {
            id: 'receipt2',
            messageId: 'msg1',
            userId: 'user3',
            type: 'READ' as const,
            timestamp: new Date(),
            user: {
              id: 'user3',
              username: 'testuser3',
              name: 'Test User 3',
              privacySettings: { showReadReceipts: false },
            },
          },
        ],
      } as any)
      
      // Act
      const result = await deliveryService.getMessageDeliveryState('msg1', 'user1')
      
      // Assert
      expect(result.deliveredTo).toContain('user2')
      expect(result.readBy).toHaveLength(0) // user3's read receipt should be hidden due to privacy
    })
  })

  describe('backfillMessages', () => {
    it('should return messages with delivery state', async () => {
      // Arrange
      jest.spyOn(prismaService.conversationMember, 'findFirst').mockResolvedValue({
        id: 'member1',
        conversationId: 'conv1',
        userId: 'user2',
        role: 'MEMBER' as const,
        permissions: {},
        joinedAt: new Date(),
        leftAt: null,
        isActive: true,
        isMuted: false,
        mutedUntil: null,
        lastReadMessageId: 'msg0',
        lastReadAt: new Date(),
      })
      
      const messages = [
        {
          id: 'msg1',
          conversationId: 'conv1',
          senderId: 'user1',
          type: 'TEXT' as const,
          content: 'Message 1',
          metadata: {},
          replyToId: null,
          isEdited: false,
          isDeleted: false,
          deletedAt: null,
          createdAt: new Date(),
          editedAt: null,
          sender: {
            id: 'user1',
            username: 'testuser1',
            email: 'test1@example.com',
            name: 'Test User 1',
            passwordHash: 'hash',
            salt: 'salt',
            privacySettings: { sendReadReceipts: true, showReadReceipts: true },
          },
          replyTo: null,
          attachments: [],
          receipts: [
            {
              id: 'receipt1',
              messageId: 'msg1',
              userId: 'user2',
              type: 'DELIVERED' as const,
              timestamp: new Date(),
              user: {
                id: 'user2',
                privacySettings: { showReadReceipts: true },
              },
            },
          ],
        },
      ]
      
      jest.spyOn(prismaService.message, 'findMany').mockResolvedValue(messages as any)
      
      // Mock the getMessageDeliveryState call
      jest.spyOn(deliveryService, 'getMessageDeliveryState').mockResolvedValue({
        messageId: 'msg1',
        state: 'delivered',
        deliveredTo: ['user2'],
        readBy: [],
        timestamp: new Date(),
      })
      
      // Act
      const result = await deliveryService.backfillMessages('user2', 'conv1', 'msg0')
      
      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].deliveryState).toBeDefined()
      expect(result[0].deliveryState.messageId).toBe('msg1')
    })
  })

  describe('message deduplication', () => {
    it('should handle duplicate messages correctly', async () => {
      // Arrange
      const tempId = 'temp123'
      
      jest.spyOn(prismaService.conversationMember, 'findMany').mockResolvedValue([
        {
          id: 'member2',
          conversationId: 'conv1',
          userId: 'user2',
          role: 'MEMBER' as const,
          permissions: {},
          joinedAt: new Date(),
          leftAt: null,
          isActive: true,
          isMuted: false,
          mutedUntil: null,
          lastReadMessageId: null,
          lastReadAt: null,
        },
      ])
      
      jest.spyOn(webSocketService, 'isUserOnline').mockResolvedValue(true)
      jest.spyOn(webSocketService, 'getUserSocketIds').mockResolvedValue(['socket1'])
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser2,
        privacySettings: { sendReadReceipts: true, showReadReceipts: true },
      })
      
      // Act - Send same message twice
      const firstResult = await deliveryService.deliverMessage(mockMessage, tempId, 'user1')
      const secondResult = await deliveryService.deliverMessage(mockMessage, tempId, 'user1')
      
      // Assert
      expect(firstResult.messageId).toBe('msg1')
      expect(secondResult.messageId).toBe('msg1')
      expect(secondResult.state).toBe('sent')
    })
  })
})