import { Test, TestingModule } from '@nestjs/testing'
import { ConversationsService } from './conversations.service'
import { PrismaService } from '../database/prisma.service'
import { ConversationType, ConversationMemberRole } from '@prisma/client'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'

describe('ConversationsService', () => {
  let service: ConversationsService
  let mockDb: jest.Mocked<PrismaService>

  const mockUser1 = {
    id: 'user1',
    username: 'testuser1',
    email: 'test1@example.com',
    name: 'Test User 1',
    isActive: true,
    isSuspended: false,
  }

  const mockUser2 = {
    id: 'user2',
    username: 'testuser2',
    email: 'test2@example.com',
    name: 'Test User 2',
    isActive: true,
    isSuspended: false,
  }

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
  }

  const mockMember = {
    id: 'member1',
    conversationId: 'conv1',
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
  }

  beforeEach(async () => {
    const mockDbService = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: PrismaService,
          useValue: mockDbService,
        },
      ],
    }).compile()

    service = module.get<ConversationsService>(ConversationsService)
    mockDb = module.get(PrismaService)
  })

  describe('createConversation', () => {
    it('should create a DM conversation successfully', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user2'],
      }

      mockDb.user.findMany.mockResolvedValue([mockUser2])
      mockDb.blockedUser.findMany.mockResolvedValue([])
      mockDb.conversation.findFirst.mockResolvedValue(null) // No existing DM
      mockDb.$transaction.mockImplementation(async (callback) => {
        return callback({
          conversation: {
            create: jest.fn().mockResolvedValue(mockConversation),
          },
          conversationMember: {
            create: jest.fn().mockResolvedValue(mockMember),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        })
      })

      // Mock the getConversationById call
      jest.spyOn(service, 'getConversationById').mockResolvedValue({
        ...mockConversation,
        members: [mockMember],
        unreadCount: 0,
      } as any)

      const result = await service.createConversation('user1', createDto)

      expect(result).toBeDefined()
      expect(result.type).toBe(ConversationType.DM)
      expect(mockDb.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user2'] },
          isActive: true,
          isSuspended: false,
        },
      })
    })

    it('should throw BadRequestException for DM with multiple participants', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user2', 'user3'],
      }

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException for DM with self', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user1'],
      }

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(BadRequestException)
    })

    it('should create a group conversation successfully', async () => {
      const createDto = {
        type: ConversationType.GROUP,
        title: 'Test Group',
        participantIds: ['user2'],
      }

      const groupConversation = {
        ...mockConversation,
        type: ConversationType.GROUP,
        title: 'Test Group',
        ownerId: 'user1',
      }

      mockDb.user.findMany.mockResolvedValue([mockUser2])
      mockDb.blockedUser.findMany.mockResolvedValue([])
      mockDb.$transaction.mockImplementation(async (callback) => {
        return callback({
          conversation: {
            create: jest.fn().mockResolvedValue(groupConversation),
          },
          conversationMember: {
            create: jest.fn().mockResolvedValue({
              ...mockMember,
              role: ConversationMemberRole.OWNER,
            }),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        })
      })

      jest.spyOn(service, 'getConversationById').mockResolvedValue({
        ...groupConversation,
        members: [{ ...mockMember, role: ConversationMemberRole.OWNER }],
        unreadCount: 0,
      } as any)

      const result = await service.createConversation('user1', createDto)

      expect(result).toBeDefined()
      expect(result.type).toBe(ConversationType.GROUP)
      expect(result.title).toBe('Test Group')
    })

    it('should throw BadRequestException for group without title', async () => {
      const createDto = {
        type: ConversationType.GROUP,
        participantIds: ['user2'],
      }

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(BadRequestException)
    })

    it('should throw ForbiddenException when trying to add blocked user', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user2'],
      }

      mockDb.user.findMany.mockResolvedValue([mockUser2])
      mockDb.blockedUser.findMany.mockResolvedValue([
        {
          id: 'block1',
          blockingUserId: 'user1',
          blockedUserId: 'user2',
        },
      ])

      await expect(service.createConversation('user1', createDto)).rejects.toThrow(ForbiddenException)
    })

    it('should return existing DM if it already exists', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: ['user2'],
      }

      mockDb.user.findMany.mockResolvedValue([mockUser2])
      mockDb.blockedUser.findMany.mockResolvedValue([])
      mockDb.conversation.findFirst.mockResolvedValue(mockConversation)

      jest.spyOn(service, 'getConversationById').mockResolvedValue({
        ...mockConversation,
        members: [mockMember],
        unreadCount: 0,
      } as any)

      const result = await service.createConversation('user1', createDto)

      expect(result).toBeDefined()
      expect(service.getConversationById).toHaveBeenCalledWith('user1', mockConversation.id)
    })
  })

  describe('getConversationById', () => {
    it('should return conversation with members and unread count', async () => {
      const conversationWithMembers = {
        ...mockConversation,
        members: [mockMember],
        messages: [],
      }

      mockDb.conversation.findFirst.mockResolvedValue(conversationWithMembers)
      mockDb.conversationMember.findMany.mockResolvedValue([
        {
          conversationId: 'conv1',
          lastReadAt: new Date(),
        },
      ])
      mockDb.message.count.mockResolvedValue(5)

      const result = await service.getConversationById('user1', 'conv1')

      expect(result).toBeDefined()
      expect(result.id).toBe('conv1')
      expect(result.members).toHaveLength(1)
      expect(result.unreadCount).toBe(5)
    })

    it('should throw NotFoundException when conversation not found', async () => {
      mockDb.conversation.findFirst.mockResolvedValue(null)

      await expect(service.getConversationById('user1', 'nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('addMember', () => {
    it('should add member to group conversation successfully', async () => {
      const addMemberDto = {
        userId: 'user3',
        role: ConversationMemberRole.MEMBER,
      }

      const groupMember = {
        ...mockMember,
        role: ConversationMemberRole.ADMIN,
        conversation: {
          ...mockConversation,
          type: ConversationType.GROUP,
        },
      }

      mockDb.conversationMember.findFirst
        .mockResolvedValueOnce(groupMember) // For permission check
        .mockResolvedValueOnce(null) // For existing member check

      mockDb.user.findFirst.mockResolvedValue({
        id: 'user3',
        isActive: true,
        isSuspended: false,
      })
      mockDb.blockedUser.findFirst.mockResolvedValue(null)
      mockDb.conversationMember.create.mockResolvedValue({
        id: 'member3',
        conversationId: 'conv1',
        userId: 'user3',
        role: ConversationMemberRole.MEMBER,
      })

      jest.spyOn(service, 'getConversationById').mockResolvedValue({} as any)

      await service.addMember('user1', 'conv1', addMemberDto)

      expect(mockDb.conversationMember.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv1',
          userId: 'user3',
          role: ConversationMemberRole.MEMBER,
        },
      })
    })

    it('should throw BadRequestException when trying to add member to DM', async () => {
      const addMemberDto = {
        userId: 'user3',
      }

      const dmMember = {
        ...mockMember,
        conversation: {
          ...mockConversation,
          type: ConversationType.DM,
        },
      }

      mockDb.conversationMember.findFirst.mockResolvedValue(dmMember)

      await expect(service.addMember('user1', 'conv1', addMemberDto)).rejects.toThrow(BadRequestException)
    })

    it('should throw ForbiddenException when user lacks permission', async () => {
      const addMemberDto = {
        userId: 'user3',
      }

      const regularMember = {
        ...mockMember,
        role: ConversationMemberRole.MEMBER,
        conversation: {
          ...mockConversation,
          type: ConversationType.GROUP,
        },
      }

      mockDb.conversationMember.findFirst.mockResolvedValue(regularMember)

      await expect(service.addMember('user1', 'conv1', addMemberDto)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('removeMember', () => {
    it('should allow user to remove themselves', async () => {
      const member = {
        ...mockMember,
        conversation: mockConversation,
      }

      const memberToRemove = {
        id: 'member1',
        role: ConversationMemberRole.MEMBER,
      }

      mockDb.conversationMember.findFirst
        .mockResolvedValueOnce(member) // For permission check
        .mockResolvedValueOnce(memberToRemove) // For member to remove

      mockDb.conversationMember.update.mockResolvedValue({})

      await service.removeMember('user1', 'conv1', 'user1')

      expect(mockDb.conversationMember.update).toHaveBeenCalledWith({
        where: { id: 'member1' },
        data: {
          isActive: false,
          leftAt: expect.any(Date),
        },
      })
    })

    it('should throw ForbiddenException when trying to remove owner by non-owner', async () => {
      const member = {
        ...mockMember,
        role: ConversationMemberRole.ADMIN,
        conversation: mockConversation,
      }

      const ownerMember = {
        id: 'owner1',
        role: ConversationMemberRole.OWNER,
      }

      mockDb.conversationMember.findFirst
        .mockResolvedValueOnce(member) // For permission check
        .mockResolvedValueOnce(ownerMember) // For member to remove

      await expect(service.removeMember('user1', 'conv1', 'owner')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('updateMember', () => {
    it('should update member role successfully', async () => {
      const updateDto = {
        role: ConversationMemberRole.ADMIN,
      }

      const adminMember = {
        ...mockMember,
        role: ConversationMemberRole.ADMIN,
      }

      const memberToUpdate = {
        id: 'member2',
        role: ConversationMemberRole.MEMBER,
      }

      mockDb.conversationMember.findFirst
        .mockResolvedValueOnce(adminMember) // For permission check
        .mockResolvedValueOnce(memberToUpdate) // For member to update

      mockDb.conversationMember.update.mockResolvedValue({})
      jest.spyOn(service, 'getConversationById').mockResolvedValue({} as any)

      await service.updateMember('user1', 'conv1', 'user2', updateDto)

      expect(mockDb.conversationMember.update).toHaveBeenCalledWith({
        where: { id: 'member2' },
        data: updateDto,
      })
    })

    it('should throw ForbiddenException when non-admin tries to update member', async () => {
      const updateDto = {
        role: ConversationMemberRole.ADMIN,
      }

      const regularMember = {
        ...mockMember,
        role: ConversationMemberRole.MEMBER,
      }

      mockDb.conversationMember.findFirst.mockResolvedValue(regularMember)

      await expect(service.updateMember('user1', 'conv1', 'user2', updateDto)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('searchConversations', () => {
    it('should return matching conversations', async () => {
      const searchResults = [
        {
          ...mockConversation,
          title: 'Test Group',
          members: [mockMember],
          messages: [],
        },
      ]

      mockDb.conversation.findMany.mockResolvedValue(searchResults)
      mockDb.conversationMember.findMany.mockResolvedValue([
        {
          conversationId: 'conv1',
          lastReadAt: new Date(),
        },
      ])
      mockDb.message.count.mockResolvedValue(0)

      const result = await service.searchConversations('user1', 'test')

      expect(result.conversations).toHaveLength(1)
      expect(result.conversations[0].title).toBe('Test Group')
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('leaveConversation', () => {
    it('should handle leaving DM conversation', async () => {
      const dmMember = {
        ...mockMember,
        conversation: {
          ...mockConversation,
          type: ConversationType.DM,
        },
      }

      mockDb.conversationMember.findFirst.mockResolvedValue(dmMember)
      mockDb.conversationMember.update.mockResolvedValue({})

      await service.leaveConversation('user1', 'conv1')

      expect(mockDb.conversationMember.update).toHaveBeenCalledWith({
        where: { id: 'member1' },
        data: {
          isActive: false,
          leftAt: expect.any(Date),
        },
      })
    })

    it('should transfer ownership when owner leaves group', async () => {
      const ownerMember = {
        ...mockMember,
        role: ConversationMemberRole.OWNER,
        conversation: {
          ...mockConversation,
          type: ConversationType.GROUP,
        },
      }

      const otherMembers = [
        {
          id: 'member2',
          userId: 'user2',
          role: ConversationMemberRole.ADMIN,
        },
      ]

      mockDb.conversationMember.findFirst.mockResolvedValue(ownerMember)
      mockDb.conversationMember.findMany.mockResolvedValue(otherMembers)
      mockDb.$transaction.mockImplementation(async (operations) => {
        return Promise.all(operations)
      })
      mockDb.conversationMember.update.mockResolvedValue({})
      mockDb.conversation.update.mockResolvedValue({})

      await service.leaveConversation('user1', 'conv1')

      expect(mockDb.$transaction).toHaveBeenCalled()
    })

    it('should delete conversation when owner leaves and no other members', async () => {
      const ownerMember = {
        ...mockMember,
        role: ConversationMemberRole.OWNER,
        conversation: {
          ...mockConversation,
          type: ConversationType.GROUP,
        },
      }

      mockDb.conversationMember.findFirst.mockResolvedValue(ownerMember)
      mockDb.conversationMember.findMany.mockResolvedValue([])
      mockDb.conversation.delete.mockResolvedValue({})

      await service.leaveConversation('user1', 'conv1')

      expect(mockDb.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv1' },
      })
    })
  })
})