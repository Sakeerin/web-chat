import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { ConversationType, ConversationMemberRole, Prisma } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { UpdateConversationDto } from './dto/update-conversation.dto'
import { AddMemberDto } from './dto/add-member.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { ConversationQueryDto } from './dto/conversation-query.dto'
import {
  ConversationWithMembers,
  ConversationListResponse,
  ConversationSearchResult,
} from './interfaces/conversation.interface'

@Injectable()
export class ConversationsService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Create a new conversation (DM or group)
   */
  async createConversation(
    userId: string,
    createDto: CreateConversationDto,
  ): Promise<ConversationWithMembers> {
    const { type, title, description, participantIds } = createDto

    // Validate conversation type requirements
    if (type === ConversationType.DM) {
      if (participantIds.length !== 1) {
        throw new BadRequestException('DM conversations must have exactly one other participant')
      }
      if (participantIds.includes(userId)) {
        throw new BadRequestException('Cannot create DM with yourself')
      }
    } else if (type === ConversationType.GROUP) {
      if (!title) {
        throw new BadRequestException('Group conversations must have a title')
      }
      if (participantIds.length < 1) {
        throw new BadRequestException('Group conversations must have at least one other participant')
      }
    }

    // Check if DM already exists
    if (type === ConversationType.DM) {
      const existingDM = await this.findExistingDM(userId, participantIds[0])
      if (existingDM) {
        return this.getConversationById(userId, existingDM.id)
      }
    }

    // Verify all participants exist and are not blocked
    const participants = await this.db.user.findMany({
      where: {
        id: { in: participantIds },
        isActive: true,
        isSuspended: false,
      },
    })

    if (participants.length !== participantIds.length) {
      throw new BadRequestException('One or more participants not found or inactive')
    }

    // Check for blocked users
    const blockedRelations = await this.db.blockedUser.findMany({
      where: {
        OR: [
          { blockingUserId: userId, blockedUserId: { in: participantIds } },
          { blockingUserId: { in: participantIds }, blockedUserId: userId },
        ],
      },
    })

    if (blockedRelations.length > 0) {
      throw new ForbiddenException('Cannot create conversation with blocked users')
    }

    // Create conversation with members in a transaction
    const conversation = await this.db.$transaction(async (tx) => {
      // Create the conversation
      const newConversation = await tx.conversation.create({
        data: {
          type,
          title,
          description,
          ownerId: type === ConversationType.GROUP ? userId : undefined,
        },
      })

      // Add creator as member
      await tx.conversationMember.create({
        data: {
          conversationId: newConversation.id,
          userId,
          role: type === ConversationType.GROUP ? ConversationMemberRole.OWNER : ConversationMemberRole.MEMBER,
        },
      })

      // Add other participants
      await tx.conversationMember.createMany({
        data: participantIds.map((participantId) => ({
          conversationId: newConversation.id,
          userId: participantId,
          role: ConversationMemberRole.MEMBER,
        })),
      })

      return newConversation
    })

    return this.getConversationById(userId, conversation.id)
  }

  /**
   * Get conversations for a user with pagination
   */
  async getConversations(
    userId: string,
    query: ConversationQueryDto,
  ): Promise<ConversationListResponse> {
    const { limit = 20, cursor, type, includeArchived = false, search } = query

    // Build where clause
    const where: Prisma.ConversationWhereInput = {
      members: {
        some: {
          userId,
          isActive: true,
        },
      },
    }

    if (type) {
      where.type = type
    }

    if (!includeArchived) {
      where.isArchived = false
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          members: {
            some: {
              user: {
                OR: [
                  { username: { contains: search, mode: 'insensitive' } },
                  { name: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ]
    }

    // Add cursor-based pagination
    if (cursor) {
      where.id = { lt: cursor }
    }

    // Get conversations with members and last message
    const conversations = await this.db.conversation.findMany({
      where,
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                username: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1, // Take one extra to check if there are more
    })

    // Check if there are more conversations
    const hasMore = conversations.length > limit
    if (hasMore) {
      conversations.pop() // Remove the extra conversation
    }

    // Get unread counts for each conversation
    const conversationIds = conversations.map((c) => c.id)
    const unreadCounts = await this.getUnreadCounts(userId, conversationIds)

    // Transform to response format
    const transformedConversations: ConversationWithMembers[] = conversations.map((conv) => 
      this.transformConversation(conv, unreadCounts[conv.id] || 0)
    )

    // Get total count for pagination info
    const total = await this.db.conversation.count({ where })

    return {
      conversations: transformedConversations,
      nextCursor: hasMore ? conversations[conversations.length - 1]?.id : undefined,
      hasMore,
      total,
    }
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversationById(userId: string, conversationId: string): Promise<ConversationWithMembers> {
    const conversation = await this.db.conversation.findFirst({
      where: {
        id: conversationId,
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                username: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    // Get unread count
    const unreadCount = await this.getUnreadCounts(userId, [conversationId])

    return this.transformConversation(conversation, unreadCount[conversationId] || 0)
  }

  /**
   * Update conversation metadata
   */
  async updateConversation(
    userId: string,
    conversationId: string,
    updateDto: UpdateConversationDto,
  ): Promise<ConversationWithMembers> {
    // Check if user has permission to update
    const member = await this.db.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
      include: {
        conversation: true,
      },
    })

    if (!member) {
      throw new NotFoundException('Conversation not found')
    }

    // Check permissions for group conversations
    if (member.conversation.type === ConversationType.GROUP) {
      if (member.role !== ConversationMemberRole.OWNER && member.role !== ConversationMemberRole.ADMIN) {
        throw new ForbiddenException('Insufficient permissions to update conversation')
      }
    }

    // Update conversation
    await this.db.conversation.update({
      where: { id: conversationId },
      data: updateDto,
    })

    return this.getConversationById(userId, conversationId)
  }

  /**
   * Add a member to a conversation
   */
  async addMember(
    userId: string,
    conversationId: string,
    addMemberDto: AddMemberDto,
  ): Promise<ConversationWithMembers> {
    const { userId: newMemberId, role = ConversationMemberRole.MEMBER } = addMemberDto

    // Check if user has permission to add members
    const member = await this.db.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
      include: {
        conversation: true,
      },
    })

    if (!member) {
      throw new NotFoundException('Conversation not found')
    }

    // Only allow adding members to group conversations
    if (member.conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Can only add members to group conversations')
    }

    // Check permissions
    if (member.role !== ConversationMemberRole.OWNER && member.role !== ConversationMemberRole.ADMIN) {
      throw new ForbiddenException('Insufficient permissions to add members')
    }

    // Check if new member exists and is not blocked
    const newMember = await this.db.user.findFirst({
      where: {
        id: newMemberId,
        isActive: true,
        isSuspended: false,
      },
    })

    if (!newMember) {
      throw new BadRequestException('User not found or inactive')
    }

    // Check for blocked relationship
    const blockedRelation = await this.db.blockedUser.findFirst({
      where: {
        OR: [
          { blockingUserId: userId, blockedUserId: newMemberId },
          { blockingUserId: newMemberId, blockedUserId: userId },
        ],
      },
    })

    if (blockedRelation) {
      throw new ForbiddenException('Cannot add blocked user to conversation')
    }

    // Check if user is already a member
    const existingMember = await this.db.conversationMember.findFirst({
      where: {
        conversationId,
        userId: newMemberId,
      },
    })

    if (existingMember) {
      if (existingMember.isActive) {
        throw new BadRequestException('User is already a member of this conversation')
      } else {
        // Reactivate existing member
        await this.db.conversationMember.update({
          where: { id: existingMember.id },
          data: {
            isActive: true,
            role,
            joinedAt: new Date(),
            leftAt: null,
          },
        })
      }
    } else {
      // Add new member
      await this.db.conversationMember.create({
        data: {
          conversationId,
          userId: newMemberId,
          role,
        },
      })
    }

    return this.getConversationById(userId, conversationId)
  }

  /**
   * Remove a member from a conversation
   */
  async removeMember(userId: string, conversationId: string, memberUserId: string): Promise<void> {
    // Check if user has permission to remove members
    const member = await this.db.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
      include: {
        conversation: true,
      },
    })

    if (!member) {
      throw new NotFoundException('Conversation not found')
    }

    // Check permissions
    const canRemove =
      userId === memberUserId || // Can remove self
      (member.role === ConversationMemberRole.OWNER || member.role === ConversationMemberRole.ADMIN)

    if (!canRemove) {
      throw new ForbiddenException('Insufficient permissions to remove member')
    }

    // Find the member to remove
    const memberToRemove = await this.db.conversationMember.findFirst({
      where: {
        conversationId,
        userId: memberUserId,
        isActive: true,
      },
    })

    if (!memberToRemove) {
      throw new NotFoundException('Member not found in conversation')
    }

    // Cannot remove owner unless they're removing themselves
    if (memberToRemove.role === ConversationMemberRole.OWNER && userId !== memberUserId) {
      throw new ForbiddenException('Cannot remove conversation owner')
    }

    // Deactivate member
    await this.db.conversationMember.update({
      where: { id: memberToRemove.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    })
  }

  /**
   * Update member role and permissions
   */
  async updateMember(
    userId: string,
    conversationId: string,
    memberUserId: string,
    updateDto: UpdateMemberDto,
  ): Promise<ConversationWithMembers> {
    // Check if user has permission to update members
    const member = await this.db.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
    })

    if (!member) {
      throw new NotFoundException('Conversation not found')
    }

    // Check permissions
    if (member.role !== ConversationMemberRole.OWNER && member.role !== ConversationMemberRole.ADMIN) {
      throw new ForbiddenException('Insufficient permissions to update member')
    }

    // Find the member to update
    const memberToUpdate = await this.db.conversationMember.findFirst({
      where: {
        conversationId,
        userId: memberUserId,
        isActive: true,
      },
    })

    if (!memberToUpdate) {
      throw new NotFoundException('Member not found in conversation')
    }

    // Cannot change owner role unless you are the owner
    if (memberToUpdate.role === ConversationMemberRole.OWNER && member.role !== ConversationMemberRole.OWNER) {
      throw new ForbiddenException('Only owner can change owner role')
    }

    // Update member
    await this.db.conversationMember.update({
      where: { id: memberToUpdate.id },
      data: {
        ...updateDto,
        mutedUntil: updateDto.mutedUntil ? new Date(updateDto.mutedUntil) : undefined,
      },
    })

    return this.getConversationById(userId, conversationId)
  }

  /**
   * Search conversations
   */
  async searchConversations(userId: string, query: string): Promise<ConversationSearchResult> {
    const conversations = await this.db.conversation.findMany({
      where: {
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          {
            members: {
              some: {
                user: {
                  OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                username: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50, // Limit search results
    })

    // Get unread counts
    const conversationIds = conversations.map((c) => c.id)
    const unreadCounts = await this.getUnreadCounts(userId, conversationIds)

    // Transform to response format
    const transformedConversations: ConversationWithMembers[] = conversations.map((conv) => 
      this.transformConversation(conv, unreadCounts[conv.id] || 0)
    )

    return {
      conversations: transformedConversations,
      total: transformedConversations.length,
      hasMore: false, // Search results are limited, so no pagination
    }
  }

  /**
   * Leave a conversation
   */
  async leaveConversation(userId: string, conversationId: string): Promise<void> {
    const member = await this.db.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true,
      },
      include: {
        conversation: true,
      },
    })

    if (!member) {
      throw new NotFoundException('Conversation not found')
    }

    // For DM conversations, just deactivate membership
    if (member.conversation.type === ConversationType.DM) {
      await this.db.conversationMember.update({
        where: { id: member.id },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      })
      return
    }

    // For group conversations, handle owner transfer if needed
    if (member.role === ConversationMemberRole.OWNER) {
      // Find another admin or member to transfer ownership
      const otherMembers = await this.db.conversationMember.findMany({
        where: {
          conversationId,
          userId: { not: userId },
          isActive: true,
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      })

      if (otherMembers.length === 0) {
        // No other members, delete the conversation
        await this.db.conversation.delete({
          where: { id: conversationId },
        })
        return
      }

      // Transfer ownership to the first admin, or first member if no admins
      const newOwner = otherMembers.find((m) => m.role === ConversationMemberRole.ADMIN) || otherMembers[0]
      
      await this.db.$transaction([
        this.db.conversationMember.update({
          where: { id: newOwner.id },
          data: { role: ConversationMemberRole.OWNER },
        }),
        this.db.conversation.update({
          where: { id: conversationId },
          data: { ownerId: newOwner.userId },
        }),
      ])
    }

    // Remove the member
    await this.db.conversationMember.update({
      where: { id: member.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    })
  }

  /**
   * Private helper methods
   */
  private transformConversation(conv: any, unreadCount: number = 0): ConversationWithMembers {
    return {
      id: conv.id,
      type: conv.type,
      title: conv.title || undefined,
      description: conv.description || undefined,
      avatarUrl: conv.avatarUrl || undefined,
      ownerId: conv.ownerId || undefined,
      isArchived: conv.isArchived,
      settings: conv.settings as Record<string, any>,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      members: conv.members.map((member: any) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        isActive: member.isActive,
        isMuted: member.isMuted,
        mutedUntil: member.mutedUntil || undefined,
        lastReadAt: member.lastReadAt || undefined,
        user: member.user,
      })),
      lastMessage: conv.messages?.[0]
        ? {
            id: conv.messages[0].id,
            content: conv.messages[0].content,
            type: conv.messages[0].type,
            senderId: conv.messages[0].senderId,
            createdAt: conv.messages[0].createdAt,
            sender: conv.messages[0].sender,
          }
        : undefined,
      unreadCount,
    }
  }

  private async findExistingDM(userId1: string, userId2: string) {
    return this.db.conversation.findFirst({
      where: {
        type: ConversationType.DM,
        members: {
          every: {
            userId: { in: [userId1, userId2] },
            isActive: true,
          },
        },
      },
    })
  }

  private async getUnreadCounts(userId: string, conversationIds: string[]): Promise<Record<string, number>> {
    const member = await this.db.conversationMember.findMany({
      where: {
        userId,
        conversationId: { in: conversationIds },
        isActive: true,
      },
      select: {
        conversationId: true,
        lastReadMessageId: true,
        lastReadAt: true,
      },
    })

    const unreadCounts: Record<string, number> = {}

    for (const memberInfo of member) {
      const unreadCount = await this.db.message.count({
        where: {
          conversationId: memberInfo.conversationId,
          senderId: { not: userId },
          isDeleted: false,
          createdAt: {
            gt: memberInfo.lastReadAt || new Date(0),
          },
        },
      })

      unreadCounts[memberInfo.conversationId] = unreadCount
    }

    return unreadCounts
  }
}