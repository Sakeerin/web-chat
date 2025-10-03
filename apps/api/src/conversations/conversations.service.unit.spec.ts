import { Test, TestingModule } from '@nestjs/testing'
import { ConversationsService } from './conversations.service'
import { PrismaService } from '../database/prisma.service'
import { ConversationType, ConversationMemberRole } from '@prisma/client'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'

// Mock PrismaService
const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  conversation: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  conversationMember: {
    create: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  blockedUser: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  message: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('ConversationsService', () => {
  let service: ConversationsService
  let prisma: typeof mockPrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<ConversationsService>(ConversationsService)
    prisma = module.get(PrismaService)

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('createConversation', () => {
    const mockUser2 = {
      id: 'user2',
      username: 'testuser2',
      email: 'test2@example.com',
      name: 'Test User 2',
      isActive: true,
      isSuspended: false,
    }

    it('should throw BadRequestException for DM with multiple participants', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user2', 'user3'],
      }

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(BadRequestException)
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException for DM with self', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user1'],
      }

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(BadRequestException)
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException for group without title', async () => {
      const createDto = {
        type: ConversationType.GROUP,
        participantIds: ['user2'],
      }

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(BadRequestException)
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })

    it('should validate participants exist for DM creation', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user2'],
      }

      prisma.user.findMany.mockResolvedValue([mockUser2])
      prisma.blockedUser.findMany.mockResolvedValue([])
      prisma.conversation.findFirst.mockResolvedValue(null)
      
      const mockConversation = {
        id: 'conv1',
        type: ConversationType.DM,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          conversation: {
            create: jest.fn().mockResolvedValue(mockConversation),
          },
          conversationMember: {
            create: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        })
      })

      // Mock getConversationById
      jest.spyOn(service, 'getConversationById').mockResolvedValue({
        id: 'conv1',
        type: ConversationType.DM,
        members: [],
        unreadCount: 0,
      } as any)

      await service.createConversation('user1', createDto)

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user2'] },
          isActive: true,
          isSuspended: false,
        },
      })
      expect(prisma.blockedUser.findMany).toHaveBeenCalled()
    })

    it('should throw BadRequestException when participant not found', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['nonexistent'],
      }

      prisma.user.findMany.mockResolvedValue([]) // No users found

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(BadRequestException)
    })

    it('should throw ForbiddenException when trying to add blocked user', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user2'],
      }

      prisma.user.findMany.mockResolvedValue([mockUser2])
      prisma.blockedUser.findMany.mockResolvedValue([
        {
          id: 'block1',
          blockingUserId: 'user1',
          blockedUserId: 'user2',
        },
      ])

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('getConversationById', () => {
    it('should throw NotFoundException when conversation not found', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null)

      await expect(service.getConversationById('user1', 'nonexistent')).rejects.toThrow(NotFoundException)
    })

    it('should return conversation with unread count', async () => {
      const mockConversation = {
        id: 'conv1',
        type: ConversationType.DM,
        title: null,
        description: null,
        avatarUrl: null,
        ownerId: null,
        isArchived: false,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'member1',
            userId: 'user1',
            role: ConversationMemberRole.MEMBER,
            joinedAt: new Date(),
            isActive: true,
            isMuted: false,
            mutedUntil: null,
            lastReadAt: null,
            user: {
              id: 'user1',
              username: 'testuser1',
              name: 'Test User 1',
              avatarUrl: null,
              isOnline: true,
              lastSeenAt: new Date(),
            },
          },
        ],
        messages: [],
      }

      prisma.conversation.findFirst.mockResolvedValue(mockConversation)
      prisma.conversationMember.findMany.mockResolvedValue([
        {
          conversationId: 'conv1',
          lastReadAt: new Date(),
        },
      ])
      prisma.message.count.mockResolvedValue(5)

      const result = await service.getConversationById('user1', 'conv1')

      expect(result).toBeDefined()
      expect(result.id).toBe('conv1')
      expect(result.unreadCount).toBe(5)
    })
  })

  describe('addMember', () => {
    it('should throw BadRequestException when trying to add member to DM', async () => {
      const addMemberDto = {
        userId: 'user3',
      }

      const dmMember = {
        id: 'member1',
        conversation: {
          type: ConversationType.DM,
        },
      }

      prisma.conversationMember.findFirst.mockResolvedValue(dmMember)

      await expect(service.addMember('user1', 'conv1', addMemberDto)).rejects.toThrow(BadRequestException)
    })

    it('should throw ForbiddenException when user lacks permission', async () => {
      const addMemberDto = {
        userId: 'user3',
      }

      const regularMember = {
        id: 'member1',
        role: ConversationMemberRole.MEMBER,
        conversation: {
          type: ConversationType.GROUP,
        },
      }

      prisma.conversationMember.findFirst.mockResolvedValue(regularMember)

      await expect(service.addMember('user1', 'conv1', addMemberDto)).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFoundException when conversation not found', async () => {
      const addMemberDto = {
        userId: 'user3',
      }

      prisma.conversationMember.findFirst.mockResolvedValue(null)

      await expect(service.addMember('user1', 'conv1', addMemberDto)).rejects.toThrow(NotFoundException)
    })
  })

  describe('removeMember', () => {
    it('should throw NotFoundException when conversation not found', async () => {
      prisma.conversationMember.findFirst.mockResolvedValue(null)

      await expect(service.removeMember('user1', 'conv1', 'user2')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when trying to remove owner by non-owner', async () => {
      const member = {
        id: 'member1',
        role: ConversationMemberRole.ADMIN,
        conversation: {
          type: ConversationType.GROUP,
        },
      }

      const ownerMember = {
        id: 'owner1',
        role: ConversationMemberRole.OWNER,
      }

      prisma.conversationMember.findFirst
        .mockResolvedValueOnce(member) // For permission check
        .mockResolvedValueOnce(ownerMember) // For member to remove

      await expect(service.removeMember('user1', 'conv1', 'owner')).rejects.toThrow(ForbiddenException)
    })

    it('should allow user to remove themselves', async () => {
      const member = {
        id: 'member1',
        conversation: {
          type: ConversationType.DM,
        },
      }

      const memberToRemove = {
        id: 'member1',
        role: ConversationMemberRole.MEMBER,
      }

      prisma.conversationMember.findFirst
        .mockResolvedValueOnce(member) // For permission check
        .mockResolvedValueOnce(memberToRemove) // For member to remove

      prisma.conversationMember.update.mockResolvedValue({})

      await service.removeMember('user1', 'conv1', 'user1')

      expect(prisma.conversationMember.update).toHaveBeenCalledWith({
        where: { id: 'member1' },
        data: {
          isActive: false,
          leftAt: expect.any(Date),
        },
      })
    })
  })

  describe('updateMember', () => {
    it('should throw ForbiddenException when non-admin tries to update member', async () => {
      const updateDto = {
        role: ConversationMemberRole.ADMIN,
      }

      const regularMember = {
        id: 'member1',
        role: ConversationMemberRole.MEMBER,
      }

      prisma.conversationMember.findFirst.mockResolvedValue(regularMember)

      await expect(service.updateMember('user1', 'conv1', 'user2', updateDto)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('should throw NotFoundException when conversation not found', async () => {
      const updateDto = {
        role: ConversationMemberRole.ADMIN,
      }

      prisma.conversationMember.findFirst.mockResolvedValue(null)

      await expect(service.updateMember('user1', 'conv1', 'user2', updateDto)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('leaveConversation', () => {
    it('should throw NotFoundException when conversation not found', async () => {
      prisma.conversationMember.findFirst.mockResolvedValue(null)

      await expect(service.leaveConversation('user1', 'conv1')).rejects.toThrow(NotFoundException)
    })

    it('should handle leaving DM conversation', async () => {
      const dmMember = {
        id: 'member1',
        conversation: {
          type: ConversationType.DM,
        },
      }

      prisma.conversationMember.findFirst.mockResolvedValue(dmMember)
      prisma.conversationMember.update.mockResolvedValue({})

      await service.leaveConversation('user1', 'conv1')

      expect(prisma.conversationMember.update).toHaveBeenCalledWith({
        where: { id: 'member1' },
        data: {
          isActive: false,
          leftAt: expect.any(Date),
        },
      })
    })

    it('should delete conversation when owner leaves and no other members', async () => {
      const ownerMember = {
        id: 'member1',
        role: ConversationMemberRole.OWNER,
        conversation: {
          type: ConversationType.GROUP,
        },
      }

      prisma.conversationMember.findFirst.mockResolvedValue(ownerMember)
      prisma.conversationMember.findMany.mockResolvedValue([])
      prisma.conversation.delete.mockResolvedValue({})

      await service.leaveConversation('user1', 'conv1')

      expect(prisma.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv1' },
      })
    })
  })

  describe('searchConversations', () => {
    it('should return matching conversations', async () => {
      const searchResults = [
        {
          id: 'conv1',
          type: ConversationType.GROUP,
          title: 'Test Group',
          description: null,
          avatarUrl: null,
          ownerId: 'user1',
          isArchived: false,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [
            {
              id: 'member1',
              userId: 'user1',
              role: ConversationMemberRole.OWNER,
              joinedAt: new Date(),
              isActive: true,
              isMuted: false,
              mutedUntil: null,
              lastReadAt: null,
              user: {
                id: 'user1',
                username: 'testuser1',
                name: 'Test User 1',
                avatarUrl: null,
                isOnline: true,
                lastSeenAt: new Date(),
              },
            },
          ],
          messages: [],
        },
      ]

      prisma.conversation.findMany.mockResolvedValue(searchResults)
      prisma.conversationMember.findMany.mockResolvedValue([
        {
          conversationId: 'conv1',
          lastReadAt: new Date(),
        },
      ])
      prisma.message.count.mockResolvedValue(0)

      const result = await service.searchConversations('user1', 'test')

      expect(result.conversations).toHaveLength(1)
      expect(result.conversations[0].title).toBe('Test Group')
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
    })
  })
})