import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SearchService } from '../search/search.service';
import {
  UpdateProfileDto,
  UpdateUsernameDto,
  PrivacySettingsDto,
  PrivacySettings,
  SearchUsersDto,
  CheckUsernameDto,
  LastSeenVisibility,
  ReadReceiptsVisibility,
} from './dto';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  lastSeenAt: Date;
  privacySettings: PrivacySettings;
  createdAt: Date;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  lastSeenAt?: Date; // Conditional based on privacy settings
  isOnline?: boolean; // Conditional based on privacy settings
}

export interface UsernameAvailability {
  available: boolean;
  suggestions?: string[];
}

export interface UserSearchResult {
  users: PublicUserProfile[];
  total: number;
  hasMore: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        bio: true,
        avatarUrl: true,
        lastSeenAt: true,
        privacySettings: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
      privacySettings: this.parsePrivacySettings(user.privacySettings),
    };
  }

  /**
   * Get public user profile (respects privacy settings)
   */
  async getPublicProfile(
    userId: string,
    viewerId?: string,
  ): Promise<PublicUserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
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
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const privacySettings = this.parsePrivacySettings(user.privacySettings);
    const isContact = viewerId ? await this.areUsersContacts(viewerId, userId) : false;

    // Apply privacy settings
    const profile: PublicUserProfile = {
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
    };

    // Show last seen based on privacy settings
    if (this.canViewLastSeen(privacySettings.lastSeenVisibility, isContact)) {
      profile.lastSeenAt = user.lastSeenAt;
    }

    // Show online status based on privacy settings
    if (this.canViewOnlineStatus(privacySettings.showOnlineStatus, isContact)) {
      profile.isOnline = user.isOnline;
    }

    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateData: UpdateProfileDto,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        bio: true,
        avatarUrl: true,
        lastSeenAt: true,
        privacySettings: true,
        createdAt: true,
      },
    });

    // Update user in search index (async, don't wait)
    this.searchService.indexUser(userId).catch(error => {
      console.error(`Failed to update user index ${userId}:`, error)
    })

    return {
      ...updatedUser,
      bio: updatedUser.bio || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      privacySettings: this.parsePrivacySettings(updatedUser.privacySettings),
    };
  }

  /**
   * Update username with availability check
   */
  async updateUsername(
    userId: string,
    updateData: UpdateUsernameDto,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if username is already taken
    const existingUser = await this.prisma.user.findUnique({
      where: { username: updateData.username },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Username is already taken');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { username: updateData.username },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        bio: true,
        avatarUrl: true,
        lastSeenAt: true,
        privacySettings: true,
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      bio: updatedUser.bio || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      privacySettings: this.parsePrivacySettings(updatedUser.privacySettings),
    };
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(
    checkData: CheckUsernameDto,
  ): Promise<UsernameAvailability> {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: checkData.username },
    });

    if (!existingUser) {
      return { available: true };
    }

    // Generate suggestions
    const suggestions = await this.generateUsernameSuggestions(checkData.username);

    return {
      available: false,
      suggestions,
    };
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: PrivacySettingsDto,
  ): Promise<PrivacySettings> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentSettings = this.parsePrivacySettings(user.privacySettings);
    const newSettings = { ...currentSettings, ...settings };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        privacySettings: newSettings,
      },
    });

    return newSettings;
  }

  /**
   * Search users by username or name
   */
  async searchUsers(
    searchData: SearchUsersDto,
    searcherId?: string,
  ): Promise<UserSearchResult> {
    const { query, limit = 20, offset = 0 } = searchData;

    if (query.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    // Search by username (exact match first, then partial)
    const usernameResults = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { startsWith: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
      },
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
      take: limit,
      skip: offset,
      orderBy: [
        // Exact matches first
        {
          username: query.toLowerCase() === query ? 'asc' : 'desc',
        },
        { username: 'asc' },
      ],
    });

    // If we don't have enough results, search by name
    let nameResults: typeof usernameResults = [];
    if (usernameResults.length < limit) {
      const remainingLimit = limit - usernameResults.length;
      const usernameIds = usernameResults.map(u => u.id);

      nameResults = await this.prisma.user.findMany({
        where: {
          isActive: true,
          id: { notIn: usernameIds },
          name: { contains: query, mode: 'insensitive' },
        },
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
        take: remainingLimit,
        orderBy: { name: 'asc' },
      });
    }

    const allResults = [...usernameResults, ...nameResults];

    // Convert to public profiles
    const users = await Promise.all(
      allResults.map(async (user) => {
        const privacySettings = this.parsePrivacySettings(user.privacySettings);
        const isContact = searcherId
          ? await this.areUsersContacts(searcherId, user.id)
          : false;

        const profile: PublicUserProfile = {
          id: user.id,
          username: user.username,
          name: user.name,
          bio: user.bio || undefined,
          avatarUrl: user.avatarUrl || undefined,
        };

        // Apply privacy settings
        if (this.canViewLastSeen(privacySettings.lastSeenVisibility, isContact)) {
          profile.lastSeenAt = user.lastSeenAt;
        }

        if (this.canViewOnlineStatus(privacySettings.showOnlineStatus, isContact)) {
          profile.isOnline = user.isOnline;
        }

        return profile;
      }),
    );

    // Get total count for pagination
    const totalCount = await this.prisma.user.count({
      where: {
        isActive: true,
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    return {
      users,
      total: totalCount,
      hasMore: offset + users.length < totalCount,
    };
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  }

  /**
   * Update user's online status
   */
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        isOnline,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Update user's avatar URL
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        bio: true,
        avatarUrl: true,
        lastSeenAt: true,
        privacySettings: true,
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      bio: updatedUser.bio || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      privacySettings: this.parsePrivacySettings(updatedUser.privacySettings),
    };
  }

  /**
   * Remove user's avatar
   */
  async removeAvatar(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        bio: true,
        avatarUrl: true,
        lastSeenAt: true,
        privacySettings: true,
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      bio: updatedUser.bio || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      privacySettings: this.parsePrivacySettings(updatedUser.privacySettings),
    };
  }

  // Private helper methods

  private parsePrivacySettings(settings: any): PrivacySettings {
    const defaultSettings: PrivacySettings = {
      lastSeenVisibility: LastSeenVisibility.EVERYONE,
      readReceiptsVisibility: ReadReceiptsVisibility.EVERYONE,
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

  private async areUsersContacts(userId1: string, userId2: string): Promise<boolean> {
    const contactRequest = await this.prisma.contactRequest.findFirst({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2, status: 'ACCEPTED' },
          { senderId: userId2, receiverId: userId1, status: 'ACCEPTED' },
        ],
      },
    });

    return !!contactRequest;
  }

  private canViewLastSeen(visibility: LastSeenVisibility, isContact: boolean): boolean {
    switch (visibility) {
      case LastSeenVisibility.EVERYONE:
        return true;
      case LastSeenVisibility.CONTACTS:
        return isContact;
      case LastSeenVisibility.NOBODY:
        return false;
      default:
        return false;
    }
  }

  private canViewOnlineStatus(showOnlineStatus: boolean, _isContact: boolean): boolean {
    return showOnlineStatus;
  }

  private async generateUsernameSuggestions(baseUsername: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Try with numbers
    for (let i = 1; i <= 5; i++) {
      const suggestion = `${baseUsername}${i}`;
      const exists = await this.prisma.user.findUnique({
        where: { username: suggestion },
      });
      
      if (!exists) {
        suggestions.push(suggestion);
      }
    }

    // Try with underscores and numbers
    for (let i = 1; i <= 3; i++) {
      const suggestion = `${baseUsername}_${i}`;
      const exists = await this.prisma.user.findUnique({
        where: { username: suggestion },
      });
      
      if (!exists) {
        suggestions.push(suggestion);
      }
    }

    return suggestions.slice(0, 5); // Return max 5 suggestions
  }
}