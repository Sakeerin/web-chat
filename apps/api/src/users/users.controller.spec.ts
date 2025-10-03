import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  UpdateUsernameDto,
  PrivacySettingsDto,
  SearchUsersDto,
  CheckUsernameDto,
  LastSeenVisibility,
  ReadReceiptsVisibility,
} from './dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: any;

  const mockUserProfile = {
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
  };

  const mockPublicProfile = {
    id: 'user-1',
    username: 'testuser',
    name: 'Test User',
    bio: 'Test bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    lastSeenAt: new Date('2023-01-01T00:00:00Z'),
    isOnline: true,
  };

  const mockRequest = {
    user: { id: 'user-1', username: 'testuser' },
  };

  beforeEach(async () => {
    const mockUsersService = {
      getProfile: jest.fn(),
      getPublicProfile: jest.fn(),
      updateProfile: jest.fn(),
      updateUsername: jest.fn(),
      checkUsernameAvailability: jest.fn(),
      updatePrivacySettings: jest.fn(),
      searchUsers: jest.fn(),
      updateLastSeen: jest.fn(),
      updateOnlineStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      usersService.getProfile.mockResolvedValue(mockUserProfile);

      const result = await controller.getMyProfile(mockRequest);

      expect(result).toEqual(mockUserProfile);
      expect(usersService.getProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getUserProfile', () => {
    it('should return public user profile', async () => {
      usersService.getPublicProfile.mockResolvedValue(mockPublicProfile);

      const result = await controller.getUserProfile('target-user-id', mockRequest);

      expect(result).toEqual(mockPublicProfile);
      expect(usersService.getPublicProfile).toHaveBeenCalledWith(
        'target-user-id',
        'user-1',
      );
    });
  });

  describe('updateMyProfile', () => {
    it('should update current user profile', async () => {
      const updateData: UpdateProfileDto = {
        name: 'Updated Name',
        bio: 'Updated bio',
      };

      const updatedProfile = { ...mockUserProfile, ...updateData };
      usersService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateMyProfile(mockRequest, updateData);

      expect(result).toEqual(updatedProfile);
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', updateData);
    });
  });

  describe('updateMyUsername', () => {
    it('should update current user username', async () => {
      const updateData: UpdateUsernameDto = { username: 'newusername' };
      const updatedProfile = { ...mockUserProfile, username: 'newusername' };

      usersService.updateUsername.mockResolvedValue(updatedProfile);

      const result = await controller.updateMyUsername(mockRequest, updateData);

      expect(result).toEqual(updatedProfile);
      expect(usersService.updateUsername).toHaveBeenCalledWith('user-1', updateData);
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should check username availability', async () => {
      const checkData: CheckUsernameDto = { username: 'testusername' };
      const availabilityResult = { available: true };

      usersService.checkUsernameAvailability.mockResolvedValue(availabilityResult);

      const result = await controller.checkUsernameAvailability(checkData);

      expect(result).toEqual(availabilityResult);
      expect(usersService.checkUsernameAvailability).toHaveBeenCalledWith(checkData);
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update privacy settings', async () => {
      const settingsData: PrivacySettingsDto = {
        lastSeenVisibility: LastSeenVisibility.CONTACTS,
        allowContactRequests: false,
      };

      const updatedSettings = {
        ...mockUserProfile.privacySettings,
        ...settingsData,
      };

      usersService.updatePrivacySettings.mockResolvedValue(updatedSettings);

      const result = await controller.updatePrivacySettings(mockRequest, settingsData);

      expect(result).toEqual(updatedSettings);
      expect(usersService.updatePrivacySettings).toHaveBeenCalledWith(
        'user-1',
        settingsData,
      );
    });
  });

  describe('getPrivacySettings', () => {
    it('should return current privacy settings', async () => {
      usersService.getProfile.mockResolvedValue(mockUserProfile);

      const result = await controller.getPrivacySettings(mockRequest);

      expect(result).toEqual(mockUserProfile.privacySettings);
      expect(usersService.getProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
      const searchData: SearchUsersDto = { query: 'test', limit: 20, offset: 0 };
      const searchResult = {
        users: [mockPublicProfile],
        total: 1,
        hasMore: false,
      };

      usersService.searchUsers.mockResolvedValue(searchResult);

      const result = await controller.searchUsers(searchData, mockRequest);

      expect(result).toEqual(searchResult);
      expect(usersService.searchUsers).toHaveBeenCalledWith(searchData, 'user-1');
    });
  });

  describe('updateLastSeen', () => {
    it('should update last seen timestamp', async () => {
      usersService.updateLastSeen.mockResolvedValue(undefined);

      await controller.updateLastSeen(mockRequest);

      expect(usersService.updateLastSeen).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateOnlineStatus', () => {
    it('should update online status', async () => {
      const statusData = { isOnline: true };
      usersService.updateOnlineStatus.mockResolvedValue(undefined);

      await controller.updateOnlineStatus(mockRequest, statusData);

      expect(usersService.updateOnlineStatus).toHaveBeenCalledWith('user-1', true);
    });
  });
});