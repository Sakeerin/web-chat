import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { ConflictException, UnauthorizedException } from '@nestjs/common'

describe('AuthController', () => {
  let controller: AuthController
  let authService: jest.Mocked<AuthService>

  const mockAuthResult = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      name: 'Test User',
      avatarUrl: undefined,
      isVerified: false,
    },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 600,
    },
  }

  const mockTokenPair = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 600,
  }

  const mockSessions = [
    {
      id: 'session-1',
      deviceId: 'device-1',
      deviceName: 'Device 1',
      deviceType: 'web',
      ipAddress: '127.0.0.1',
      userAgent: 'Browser',
      lastUsedAt: new Date(),
      createdAt: new Date(),
      isActive: true,
    },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            getUserSessions: jest.fn(),
            revokeSession: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get(AuthService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser',
      name: 'Test User',
    }

    it('should successfully register a user', async () => {
      authService.register.mockResolvedValue(mockAuthResult)

      const result = await controller.register(
        registerDto,
        '127.0.0.1',
        'Mozilla/5.0',
      )

      expect(result).toEqual(mockAuthResult)
      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        expect.objectContaining({
          deviceType: 'web',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      )
    })

    it('should handle registration conflicts', async () => {
      authService.register.mockRejectedValue(
        new ConflictException('Email already registered'),
      )

      await expect(
        controller.register(registerDto, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password',
    }

    const mockRequest = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      },
    }

    it('should successfully login a user', async () => {
      authService.login.mockResolvedValue(mockAuthResult)

      const result = await controller.login(
        loginDto,
        '127.0.0.1',
        'Mozilla/5.0',
      )

      expect(result).toEqual(mockAuthResult)
      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        expect.objectContaining({
          deviceType: 'web',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      )
    })

    it('should handle login failures', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      )

      await expect(
        controller.login(loginDto, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('refreshToken', () => {
    const refreshTokenDto = {
      refreshToken: 'refresh-token',
    }

    it('should successfully refresh token', async () => {
      authService.refreshToken.mockResolvedValue(mockTokenPair)

      const result = await controller.refreshToken(refreshTokenDto)

      expect(result).toEqual(mockTokenPair)
      expect(authService.refreshToken).toHaveBeenCalledWith('refresh-token')
    })

    it('should handle invalid refresh token', async () => {
      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      )

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })

  describe('logout', () => {
    const mockRequest = {
      user: {
        userId: 'user-1',
        sessionId: 'session-1',
      },
    }

    it('should successfully logout using session from request', async () => {
      authService.logout.mockResolvedValue()

      await controller.logout(mockRequest, {})

      expect(authService.logout).toHaveBeenCalledWith('session-1')
    })

    it('should successfully logout using provided session ID', async () => {
      authService.logout.mockResolvedValue()

      await controller.logout(mockRequest, { sessionId: 'custom-session' })

      expect(authService.logout).toHaveBeenCalledWith('custom-session')
    })
  })

  describe('logoutAll', () => {
    const mockRequest = {
      user: {
        userId: 'user-1',
      },
    }

    it('should successfully logout all sessions', async () => {
      authService.logoutAll.mockResolvedValue()

      await controller.logoutAll(mockRequest)

      expect(authService.logoutAll).toHaveBeenCalledWith('user-1')
    })
  })

  describe('getSessions', () => {
    const mockRequest = {
      user: {
        userId: 'user-1',
      },
    }

    it('should successfully get user sessions', async () => {
      authService.getUserSessions.mockResolvedValue(mockSessions)

      const result = await controller.getSessions(mockRequest)

      expect(result).toEqual(mockSessions)
      expect(authService.getUserSessions).toHaveBeenCalledWith('user-1')
    })
  })

  describe('revokeSession', () => {
    const mockRequest = {
      user: {
        userId: 'user-1',
      },
    }

    it('should successfully revoke a session', async () => {
      authService.revokeSession.mockResolvedValue()

      await controller.revokeSession(mockRequest, 'session-1')

      expect(authService.revokeSession).toHaveBeenCalledWith('user-1', 'session-1')
    })
  })

  describe('requestPasswordReset', () => {
    const requestDto = {
      email: 'test@example.com',
    }

    it('should successfully request password reset', async () => {
      authService.requestPasswordReset.mockResolvedValue({
        token: 'reset-token',
        expiresAt: new Date(),
      })

      const result = await controller.requestPasswordReset(requestDto)

      expect(result).toEqual({
        message: 'If this email is registered, you will receive a reset link',
      })
      expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@example.com')
    })
  })

  describe('resetPassword', () => {
    const resetDto = {
      token: 'reset-token',
      newPassword: 'NewPassword123!',
    }

    it('should successfully reset password', async () => {
      authService.resetPassword.mockResolvedValue()

      const result = await controller.resetPassword(resetDto)

      expect(result).toEqual({
        message: 'Password reset successfully',
      })
      expect(authService.resetPassword).toHaveBeenCalledWith(
        'reset-token',
        'NewPassword123!',
      )
    })
  })

  describe('getProfile', () => {
    const mockRequest = {
      user: {
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session-1',
      },
    }

    it('should successfully get user profile', async () => {
      const result = await controller.getProfile(mockRequest)

      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session-1',
      })
    })
  })
})