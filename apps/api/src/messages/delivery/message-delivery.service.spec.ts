import { Test, TestingModule } from '@nestjs/testing'
import { MessageDeliveryService } from './message-delivery.service'
import { PrismaService } from '../../database/prisma.service'
import { WebSocketService } from '../../websocket/websocket.service'
import { MessageWithRelations } from '../interfaces/message.interface'

describe('MessageDeliveryService', () => {
  let service: MessageDeliveryService
  let prismaService: PrismaService
  let webSocketService: WebSocketService

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
    const module: TestingModule = await Test.createTestingModule({
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
            broadcastMessageReceipt: jest.fn(),
            getUserSocketIds: jest.fn(),
            sendMessageAckToSocket: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<MessageDeliveryService>(MessageDeliveryService)
    prismaService = module.get<PrismaService>(PrismaService)
    webSocketService = module.get<WebSocketService>(WebSocketService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('deliverMessage', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })

    it('should handle message delivery to online users', async () => {
      // Arrange
      const tempId = 'temp123'
      
      jest.spyOn(service as any, 'checkMessageDeduplication').mockResolvedValue({
        isDuplicate: false,
      })
      
      jest.spyOn(service as any, 'storeDeduplicationMapping').mockResolvedValue(undefined)
      jest.spyOn(service as any, 'getConversationMembers').mockResolvedValue([
        { userId: 'user2' },
      ])
      
      jest.spyOn(webSocketService, 'isUserOnline').mockResolvedValue(true)
      jest.spyOn(service as any, 'deliverToOnlineUser').mockResolvedValue(undefined)
      jest.spyOn(service as any, 'createDeliveryReceipt').mockResolvedValue(undefined)
      jest.spyOn(webSocketService, 'getUserSocketIds').mockResolvedValue(['socket1'])
      jest.spyOn(webSocketService, 'sendMessageAckToSocket').mockResolvedValue(undefined)

      // Act
      const result = await service.deliverMessage(mockMessage, tempId, 'user1')

      // Assert
      expect(result.state).toBe('sent')
      expect(result.deliveredTo).toContain('user2')
      expect(service['deliverToOnlineUser']).toHaveBeenCalledWith(mockMessage, 'user2')
      expect(service['createDeliveryReceipt']).toHaveBeenCalledWith('msg1', 'user2', 'DELIVERED')
    })

    it('should queue messages for offline users', async () => {
      // Arrange
      const tempId = 'temp123'
      
      jest.spyOn(service as any, 'checkMessageDeduplication').mockResolvedValue({
        isDuplicate: false,
      })
      
      jest.spyOn(service as any, 'storeDeduplicationMapping').mockResolvedValue(undefined)
      jest.spyOn(service as any, 'getConversationMembers').mockResolvedValue([
        { userId: 'user2' },
      ])
      
      jest.spyOn(webSocketService, 'isUserOnline').mockResolvedValue(false)
      jest.spyOn(service as any, 'queueMessageForOfflineUser').mockResolvedValue(undefined)
      jest.spyOn(webSocketService, 'getUserSocketIds').mockResolvedValue(['socket1'])
      jest.spyOn(webSocketService, 'sendMessageAckToSocket').mockResolvedValue(undefined)

      // Act
      const result = await service.deliverMessage(mockMessage, tempId, 'user1')

      // Assert
      expect(result.state).toBe('sent')
      expect(result.deliveredTo).toHaveLength(0)
      expect(service['queueMessageForOfflineUser']).toHaveBeenCalledWith(mockMessage, 'user2')
    })

    it('should handle duplicate messages', async () => {
      // Arrange
      const tempId = 'temp123'
      
      jest.spyOn(service as any, 'checkMessageDeduplication').mockResolvedValue({
        isDuplicate: true,
        existingMessageId: 'existing-msg-id',
      })

      // Act
      const result = await service.deliverMessage(mockMessage, tempId, 'user1')

      // Assert
      expect(result.messageId).toBe('existing-msg-id')
      expect(result.state).toBe('sent')
    })
  })

  describe('markMessageAsRead', () => {
    it('should create read receipt when privacy allows', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        id: 'user2',
        username: 'user2',
        email: 'user2@test.com',
        name: 'User 2',
        passwordHash: 'hash',
        salt: 'salt',
        phone: null,
        bio: null,
        avatarUrl: null,
        lastSeenAt: new Date(),
        isOnline: false,
        isActive: true,
        isVerified: false,
        isSuspended: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        privacySettings: { sendReadReceipts: true },
      })
      
      jest.spyOn(service as any, 'createDeliveryReceipt').mockResolvedValue(undefined)
      jest.spyOn(webSocketService, 'broadcastMessageReceipt').mockResolvedValue(undefined)

      // Act
      await service.markMessageAsRead('msg1', 'user2', 'conv1')

      // Assert
      expect(service['createDeliveryReceipt']).toHaveBeenCalledWith('msg1', 'user2', 'READ')
      expect(webSocketService.broadcastMessageReceipt).toHaveBeenCalledWith('conv1', 'msg1', 'user2', 'seen')
      expect(prismaService.conversationMember.updateMany).toHaveBeenCalled()
    })

    it('should not send read receipt when privacy disallows', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        id: 'user2',
        username: 'user2',
        email: 'user2@test.com',
        name: 'User 2',
        passwordHash: 'hash',
        salt: 'salt',
        phone: null,
        bio: null,
        avatarUrl: null,
        lastSeenAt: new Date(),
        isOnline: false,
        isActive: true,
        isVerified: false,
        isSuspended: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        privacySettings: { sendReadReceipts: false },
      })
      
      jest.spyOn(service as any, 'createDeliveryReceipt').mockResolvedValue(undefined)
      jest.spyOn(webSocketService, 'broadcastMessageReceipt').mockResolvedValue(undefined)

      // Act
      await service.markMessageAsRead('msg1', 'user2', 'conv1')

      // Assert
      expect(service['createDeliveryReceipt']).not.toHaveBeenCalled()
      expect(webSocketService.broadcastMessageReceipt).not.toHaveBeenCalled()
      expect(prismaService.conversationMember.updateMany).toHaveBeenCalled()
    })
  })

  describe('getMessageDeliveryState', () => {
    it('should return delivery state with privacy filtering', async () => {
      // Arrange
      const mockMessageWithReceipts = {
        ...mockMessage,
        receipts: [
          {
            id: 'receipt1',
            messageId: 'msg1',
            userId: 'user2',
            type: 'DELIVERED',
            timestamp: new Date(),
            user: {
              id: 'user2',
              username: 'user2',
              name: 'User 2',
              privacySettings: { showReadReceipts: true },
            },
          },
          {
            id: 'receipt2',
            messageId: 'msg1',
            userId: 'user3',
            type: 'READ',
            timestamp: new Date(),
            user: {
              id: 'user3',
              username: 'user3',
              name: 'User 3',
              privacySettings: { showReadReceipts: false },
            },
          },
        ],
      }

      jest.spyOn(prismaService.message, 'findFirst').mockResolvedValue(mockMessageWithReceipts)

      // Act
      const result = await service.getMessageDeliveryState('msg1', 'user1')

      // Assert
      expect(result.deliveredTo).toContain('user2')
      expect(result.readBy).not.toContain('user3') // Should be filtered due to privacy
      expect(result.state).toBe('delivered')
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
        lastReadMessageId: null,
        lastReadAt: null,
      })

      jest.spyOn(prismaService.message, 'findMany').mockResolvedValue([mockMessage])
      jest.spyOn(service, 'getMessageDeliveryState').mockResolvedValue({
        messageId: 'msg1',
        state: 'delivered',
        deliveredTo: ['user2'],
        readBy: [],
        timestamp: new Date(),
      })

      // Act
      const result = await service.backfillMessages('user2', 'conv1')

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].deliveryState.state).toBe('delivered')
    })

    it('should use provided lastMessageId for filtering', async () => {
      // Arrange
      const lastMessageId = 'last-msg-id'
      
      jest.spyOn(prismaService.message, 'findMany').mockResolvedValue([])

      // Act
      await service.backfillMessages('user2', 'conv1', lastMessageId)

      // Assert
      expect(prismaService.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { gt: lastMessageId },
          }),
        }),
      )
    })
  })
})