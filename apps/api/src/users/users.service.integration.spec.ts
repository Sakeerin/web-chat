import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import {
  UpdateProfileDto,
  UpdateUsernameDto,
  PrivacySettingsDto,
  SearchUsersDto,
  CheckUsernameDto,
  LastSeenVisibility,
  ReadReceiptsVisibility,
} from './dto';

// Mock the PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  contactRequest: {
    findFirst: jest.fn(),
  },
};

describe('UsersService Integration', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    bio: 'Test bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    lastSeenAt: new Date('2023-01-01T00:00:00Z'),
    privacySettings: {
      lastSeenVisibility: LastSeenVisibility.EVERYONE,
      readReceiptsVisibility: ReadReceiptsVisibility.EVERYONE,
      allowContactRequests: true,
      showOnlineStatus: true,
    },
    createdAt: new Date('2023-01-01T00:00:00Z'),
    isOnline: true,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Profile Management', () => {
    it('should have getProfile method', () => {
      expect(service.getProfile).toBeDefined();
      expect(typeof service.getProfile).toBe('function');
    });

    it('should have updateProfile method', () => {
      expect(service.updateProfile).toBeDefined();
      expect(typeof service.updateProfile).toBe('function');
    });

    it('should have getPublicProfile method', () => {
      expect(service.getPublicProfile).toBeDefined();
      expect(typeof service.getPublicProfile).toBe('function');
    });
  });

  describe('Username Management', () => {
    it('should have updateUsername method', () => {
      expect(service.updateUsername).toBeDefined();
      expect(typeof service.updateUsername).toBe('function');
    });

    it('should have checkUsernameAvailability method', () => {
      expect(service.checkUsernameAvailability).toBeDefined();
      expect(typeof service.checkUsernameAvailability).toBe('function');
    });
  });

  describe('Privacy Settings', () => {
    it('should have updatePrivacySettings method', () => {
      expect(service.updatePrivacySettings).toBeDefined();
      expect(typeof service.updatePrivacySettings).toBe('function');
    });
  });

  describe('User Search', () => {
    it('should have searchUsers method', () => {
      expect(service.searchUsers).toBeDefined();
      expect(typeof service.searchUsers).toBe('function');
    });
  });

  describe('Activity Tracking', () => {
    it('should have updateLastSeen method', () => {
      expect(service.updateLastSeen).toBeDefined();
      expect(typeof service.updateLastSeen).toBe('function');
    });

    it('should have updateOnlineStatus method', () => {
      expect(service.updateOnlineStatus).toBeDefined();
      expect(typeof service.updateOnlineStatus).toBe('function');
    });
  });

  describe('Basic Functionality Tests', () => {
    it('should call prisma.user.findUnique when getting profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.getProfile('user-1');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1', isActive: true },
        select: expect.any(Object),
      });
    });

    it('should call prisma.user.update when updating profile', async () => {
      const updateData: UpdateProfileDto = { name: 'New Name' };
      
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, ...updateData });

      await service.updateProfile('user-1', updateData);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateData,
        select: expect.any(Object),
      });
    });

    it('should call prisma.user.update when updating last seen', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.updateLastSeen('user-1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastSeenAt: expect.any(Date) },
      });
    });

    it('should call prisma.user.update when updating online status', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.updateOnlineStatus('user-1', true);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          isOnline: true,
          lastSeenAt: expect.any(Date),
        },
      });
    });
  });
});