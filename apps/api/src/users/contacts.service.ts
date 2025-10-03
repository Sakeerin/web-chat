import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ContactRequestStatus, ReportStatus } from '@prisma/client';
import {
  SendContactRequestDto,
  RespondToContactRequestDto,
  ContactRequestResponse,
  ContactListResponse,
  ContactResponse,
  BlockUserDto,
  BlockUserByUsernameDto,
  UnblockUserDto,
  BlockedUserResponse,
  BlockedUsersListResponse,
  ReportUserDto,
  ReportUserByUsernameDto,
  UserReportResponse,
} from './dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a contact request by username
   */
  async sendContactRequest(
    senderId: string,
    requestData: SendContactRequestDto,
  ): Promise<ContactRequestResponse> {
    // Find the target user by username
    const targetUser = await this.prisma.user.findUnique({
      where: { username: requestData.username, isActive: true },
      select: { id: true, username: true, name: true, avatarUrl: true, privacySettings: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === senderId) {
      throw new BadRequestException('Cannot send contact request to yourself');
    }

    // Check if user allows contact requests
    const privacySettings = this.parsePrivacySettings(targetUser.privacySettings);
    if (!privacySettings.allowContactRequests) {
      throw new ForbiddenException('User does not accept contact requests');
    }

    // Check if users are blocked
    const isBlocked = await this.areUsersBlocked(senderId, targetUser.id);
    if (isBlocked) {
      throw new ForbiddenException('Cannot send contact request to blocked user');
    }

    // Check if contact request already exists
    const existingRequest = await this.prisma.contactRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId: targetUser.id,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === ContactRequestStatus.PENDING) {
        throw new ConflictException('Contact request already sent');
      }
      if (existingRequest.status === ContactRequestStatus.ACCEPTED) {
        throw new ConflictException('Users are already contacts');
      }
      if (existingRequest.status === ContactRequestStatus.BLOCKED) {
        throw new ForbiddenException('Cannot send contact request');
      }
    }

    // Check reverse request (if target user already sent request to sender)
    const reverseRequest = await this.prisma.contactRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: targetUser.id,
          receiverId: senderId,
        },
      },
    });

    if (reverseRequest && reverseRequest.status === ContactRequestStatus.PENDING) {
      // Auto-accept the reverse request and create mutual contact
      await this.prisma.contactRequest.update({
        where: { id: reverseRequest.id },
        data: { status: ContactRequestStatus.ACCEPTED },
      });

      // Create the new request as accepted
      const contactRequest = await this.prisma.contactRequest.create({
        data: {
          senderId,
          receiverId: targetUser.id,
          status: ContactRequestStatus.ACCEPTED,
          message: requestData.message,
        },
        include: {
          sender: {
            select: { id: true, username: true, name: true, avatarUrl: true },
          },
          receiver: {
            select: { id: true, username: true, name: true, avatarUrl: true },
          },
        },
      });

      return contactRequest;
    }

    // Create new contact request
    const contactRequest = await this.prisma.contactRequest.create({
      data: {
        senderId,
        receiverId: targetUser.id,
        status: ContactRequestStatus.PENDING,
        message: requestData.message,
      },
      include: {
        sender: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
    });

    return contactRequest;
  }

  /**
   * Respond to a contact request (accept/decline)
   */
  async respondToContactRequest(
    userId: string,
    requestId: string,
    responseData: RespondToContactRequestDto,
  ): Promise<ContactRequestResponse> {
    const contactRequest = await this.prisma.contactRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!contactRequest) {
      throw new NotFoundException('Contact request not found');
    }

    if (contactRequest.receiverId !== userId) {
      throw new ForbiddenException('Not authorized to respond to this request');
    }

    if (contactRequest.status !== ContactRequestStatus.PENDING) {
      throw new ConflictException('Contact request has already been responded to');
    }

    const updatedRequest = await this.prisma.contactRequest.update({
      where: { id: requestId },
      data: { status: responseData.status },
      include: {
        sender: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
    });

    return updatedRequest;
  }

  /**
   * Get pending contact requests (received)
   */
  async getPendingContactRequests(userId: string): Promise<ContactRequestResponse[]> {
    const requests = await this.prisma.contactRequest.findMany({
      where: {
        receiverId: userId,
        status: ContactRequestStatus.PENDING,
      },
      include: {
        sender: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  /**
   * Get sent contact requests
   */
  async getSentContactRequests(userId: string): Promise<ContactRequestResponse[]> {
    const requests = await this.prisma.contactRequest.findMany({
      where: {
        senderId: userId,
        status: ContactRequestStatus.PENDING,
      },
      include: {
        sender: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  /**
   * Get user's contacts list
   */
  async getContacts(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ContactListResponse> {
    // Get accepted contact requests where user is either sender or receiver
    const contactRequests = await this.prisma.contactRequest.findMany({
      where: {
        OR: [
          { senderId: userId, status: ContactRequestStatus.ACCEPTED },
          { receiverId: userId, status: ContactRequestStatus.ACCEPTED },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            bio: true,
            avatarUrl: true,
            lastSeenAt: true,
            isOnline: true,
            privacySettings: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            bio: true,
            avatarUrl: true,
            lastSeenAt: true,
            isOnline: true,
            privacySettings: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const contacts: ContactResponse[] = contactRequests.map((request) => {
      // Get the contact (the other user in the relationship)
      const contact = request.senderId === userId ? request.receiver : request.sender;
      const privacySettings = this.parsePrivacySettings(contact.privacySettings);

      const contactResponse: ContactResponse = {
        id: contact.id,
        username: contact.username,
        name: contact.name,
        bio: contact.bio || undefined,
        avatarUrl: contact.avatarUrl || undefined,
        contactedAt: request.updatedAt,
      };

      // Apply privacy settings for last seen and online status
      if (this.canViewLastSeen(privacySettings.lastSeenVisibility, true)) {
        contactResponse.lastSeenAt = contact.lastSeenAt;
      }

      if (this.canViewOnlineStatus(privacySettings.showOnlineStatus, true)) {
        contactResponse.isOnline = contact.isOnline;
      }

      return contactResponse;
    });

    // Get total count
    const totalCount = await this.prisma.contactRequest.count({
      where: {
        OR: [
          { senderId: userId, status: ContactRequestStatus.ACCEPTED },
          { receiverId: userId, status: ContactRequestStatus.ACCEPTED },
        ],
      },
    });

    return {
      contacts,
      total: totalCount,
      hasMore: offset + contacts.length < totalCount,
    };
  }

  /**
   * Remove a contact (delete the contact relationship)
   */
  async removeContact(userId: string, contactId: string): Promise<void> {
    const contactRequest = await this.prisma.contactRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: contactId, status: ContactRequestStatus.ACCEPTED },
          { senderId: contactId, receiverId: userId, status: ContactRequestStatus.ACCEPTED },
        ],
      },
    });

    if (!contactRequest) {
      throw new NotFoundException('Contact relationship not found');
    }

    await this.prisma.contactRequest.delete({
      where: { id: contactRequest.id },
    });
  }

  /**
   * Block a user by ID
   */
  async blockUser(userId: string, blockData: BlockUserDto): Promise<BlockedUserResponse> {
    if (userId === blockData.userId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: blockData.userId, isActive: true },
      select: { id: true, username: true, name: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already blocked
    const existingBlock = await this.prisma.blockedUser.findUnique({
      where: {
        blockingUserId_blockedUserId: {
          blockingUserId: userId,
          blockedUserId: blockData.userId,
        },
      },
    });

    if (existingBlock) {
      throw new ConflictException('User is already blocked');
    }

    // Remove any existing contact relationship
    await this.prisma.contactRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: blockData.userId },
          { senderId: blockData.userId, receiverId: userId },
        ],
      },
    });

    // Create block record
    const blockedUser = await this.prisma.blockedUser.create({
      data: {
        blockingUserId: userId,
        blockedUserId: blockData.userId,
        reason: blockData.reason,
      },
      include: {
        blockedUser: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
    });

    return blockedUser;
  }

  /**
   * Block a user by username
   */
  async blockUserByUsername(
    userId: string,
    blockData: BlockUserByUsernameDto,
  ): Promise<BlockedUserResponse> {
    // Find the target user by username
    const targetUser = await this.prisma.user.findUnique({
      where: { username: blockData.username, isActive: true },
      select: { id: true, username: true, name: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    return this.blockUser(userId, {
      userId: targetUser.id,
      reason: blockData.reason,
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, unblockData: UnblockUserDto): Promise<void> {
    const blockedUser = await this.prisma.blockedUser.findUnique({
      where: {
        blockingUserId_blockedUserId: {
          blockingUserId: userId,
          blockedUserId: unblockData.userId,
        },
      },
    });

    if (!blockedUser) {
      throw new NotFoundException('User is not blocked');
    }

    await this.prisma.blockedUser.delete({
      where: { id: blockedUser.id },
    });
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<BlockedUsersListResponse> {
    const blockedUsers = await this.prisma.blockedUser.findMany({
      where: { blockingUserId: userId },
      include: {
        blockedUser: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const totalCount = await this.prisma.blockedUser.count({
      where: { blockingUserId: userId },
    });

    return {
      blockedUsers,
      total: totalCount,
      hasMore: offset + blockedUsers.length < totalCount,
    };
  }

  /**
   * Report a user by ID
   */
  async reportUser(userId: string, reportData: ReportUserDto): Promise<UserReportResponse> {
    if (userId === reportData.userId) {
      throw new BadRequestException('Cannot report yourself');
    }

    // Check if user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: reportData.userId, isActive: true },
      select: { id: true, username: true, name: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if user has already reported this user recently (within 24 hours)
    const recentReport = await this.prisma.userReport.findFirst({
      where: {
        reporterId: userId,
        reportedUserId: reportData.userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });

    if (recentReport) {
      throw new ConflictException('You have already reported this user recently');
    }

    const report = await this.prisma.userReport.create({
      data: {
        reporterId: userId,
        reportedUserId: reportData.userId,
        reason: reportData.reason,
        description: reportData.description,
        status: ReportStatus.PENDING,
      },
      include: {
        reported: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
    });

    return report;
  }

  /**
   * Report a user by username
   */
  async reportUserByUsername(
    userId: string,
    reportData: ReportUserByUsernameDto,
  ): Promise<UserReportResponse> {
    // Find the target user by username
    const targetUser = await this.prisma.user.findUnique({
      where: { username: reportData.username, isActive: true },
      select: { id: true, username: true, name: true, avatarUrl: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    return this.reportUser(userId, {
      userId: targetUser.id,
      reason: reportData.reason,
      description: reportData.description,
    });
  }

  /**
   * Check if two users are contacts
   */
  async areUsersContacts(userId1: string, userId2: string): Promise<boolean> {
    const contactRequest = await this.prisma.contactRequest.findFirst({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2, status: ContactRequestStatus.ACCEPTED },
          { senderId: userId2, receiverId: userId1, status: ContactRequestStatus.ACCEPTED },
        ],
      },
    });

    return !!contactRequest;
  }

  /**
   * Check if users are blocked (either direction)
   */
  async areUsersBlocked(userId1: string, userId2: string): Promise<boolean> {
    const blockRecord = await this.prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockingUserId: userId1, blockedUserId: userId2 },
          { blockingUserId: userId2, blockedUserId: userId1 },
        ],
      },
    });

    return !!blockRecord;
  }

  // Private helper methods
  private parsePrivacySettings(settings: any): any {
    const defaultSettings = {
      lastSeenVisibility: 'EVERYONE',
      readReceiptsVisibility: 'EVERYONE',
      allowContactRequests: true,
      showOnlineStatus: true,
    };

    if (!settings || typeof settings !== 'object') {
      return defaultSettings;
    }

    return {
      lastSeenVisibility: settings.lastSeenVisibility || defaultSettings.lastSeenVisibility,
      readReceiptsVisibility: settings.readReceiptsVisibility || defaultSettings.readReceiptsVisibility,
      allowContactRequests: settings.allowContactRequests ?? defaultSettings.allowContactRequests,
      showOnlineStatus: settings.showOnlineStatus ?? defaultSettings.showOnlineStatus,
    };
  }

  private canViewLastSeen(visibility: string, isContact: boolean): boolean {
    switch (visibility) {
      case 'EVERYONE':
        return true;
      case 'CONTACTS':
        return isContact;
      case 'NOBODY':
        return false;
      default:
        return false;
    }
  }

  private canViewOnlineStatus(showOnlineStatus: boolean, _isContact: boolean): boolean {
    return showOnlineStatus;
  }
}