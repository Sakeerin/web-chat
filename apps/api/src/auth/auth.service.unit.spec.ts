import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common'
import * as argon2 from 'argon2'
import * as crypto from 'crypto'
import { AuthService } from './auth.service'
import { PrismaService } from '../database/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

// Mock crypto.randomBytes
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(),
  randomUUID: jest.fn(),
}))

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 'argon2id',
}))

describe('AuthService Unit Tests', () => {
  let service: AuthService
  let prismaService: any
  let jwtService: jest.Mocked<JwtService>
  let configService: jest.Mocked<ConfigService>

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: null,
    isVerified: false,
    passwordHash: 'hashed-password',
    salt: 'salt-123',
    isActive: true,
    isSuspended: false,
  }

  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    deviceId: 'device-1',
    deviceName: 'Chrome Browser',
    deviceType: 'web',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    refreshToken: 'refresh-token-123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(),
    isActive: true,
    createdAt: new Date(),
    user: {
      email: mockUser.email,
      username: mockUser.username,
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            userSession: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findFirst: jest.fn(),
            },
            passwordResetToken: {
              findUnique: jest.fn(),
              create: jest.fn(),
              updateMany: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          } as any,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
              const config = {
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_ACCESS_EXPIRES_IN: '10m',
                JWT_SECRET: 'test-secret',
              }
              return config[key] || defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prismaService = module.get(PrismaService)
    jwtService = module.get(JwtService)
    configService = module.get(ConfigService)

    // Reset mocks
    jest.clearAllMocks()
    ;(crypto.randomBytes as jest.Mock).mockImplementation(() => ({
      toString: jest.fn().mockReturnValue('random-bytes')
    }))
    ;(crypto.randomUUID as jest.Mock).mockReturnValue('uuid-123')
  })

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser',
      name: 'Test User',
    }

    const deviceInfo = {
      deviceId: 'device-1',
      deviceType: 'web',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    }

    it('should successfully register a new user', async () => {
      // Arrange
      prismaService.user.findFirst.mockResolvedValue(null)
      ;(argon2.hash as jest.Mock).mockResolvedValue('hashed-password')
      prismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: registerDto.email,
        username: registerDto.username,
        name: registerDto.name,
        avatarUrl: null,
        isVerified: false,
      })
      prismaService.userSession.create.mockResolvedValue(mockSession)

      // Act
      const result = await service.register(registerDto, deviceInfo)

      // Assert
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: registerDto.email }, { username: registerDto.username }],
        },
      })
      expect(argon2.hash).toHaveBeenCalledWith(
        registerDto.password + 'random-bytes',
        expect.objectContaining({
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1,
        })
      )
      expect(result.user.email).toBe(registerDto.email)
      expect(result.tokens.accessToken).toBe('mock-access-token')
    })

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      prismaService.user.findFirst.mockResolvedValue({ ...mockUser, email: registerDto.email })

      // Act & Assert
      await expect(service.register(registerDto, deviceInfo)).rejects.toThrow(
        new ConflictException('Email already registered')
      )
    })

    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      prismaService.user.findFirst.mockResolvedValue({ 
        ...mockUser, 
        username: registerDto.username,
        email: 'different@example.com' // Different email to test username conflict specifically
      })

      // Act & Assert
      await expect(service.register(registerDto, deviceInfo)).rejects.toThrow(
        new ConflictException('Username already taken')
      )
    })
  })

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    }

    const deviceInfo = {
      deviceId: 'device-1',
      deviceType: 'web',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    }

    it('should successfully login with valid credentials', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser)
      ;(argon2.verify as jest.Mock).mockResolvedValue(true)
      prismaService.userSession.create.mockResolvedValue(mockSession)

      // Act
      const result = await service.login(loginDto, deviceInfo)

      // Assert
      expect(result.user.email).toBe(loginDto.email)
      expect(result.tokens.accessToken).toBe('mock-access-token')
    })

    it('should throw UnauthorizedException with invalid credentials', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser)
      ;(argon2.verify as jest.Mock).mockResolvedValue(false)

      // Act & Assert
      await expect(service.login(loginDto, deviceInfo)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      )
    })

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null)

      // Act & Assert
      await expect(service.login(loginDto, deviceInfo)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      )
    })
  })

  describe('validateUser', () => {
    it('should return user data for valid credentials', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser)
      ;(argon2.verify as jest.Mock).mockResolvedValue(true)

      // Act
      const result = await service.validateUser('test@example.com', 'Password123!')

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        name: mockUser.name,
        avatarUrl: mockUser.avatarUrl,
        isVerified: mockUser.isVerified,
        isActive: mockUser.isActive,
        isSuspended: mockUser.isSuspended,
      })
    })

    it('should return null for invalid password', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser)
      ;(argon2.verify as jest.Mock).mockResolvedValue(false)

      // Act
      const result = await service.validateUser('test@example.com', 'wrongpassword')

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for inactive user', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false })

      // Act
      const result = await service.validateUser('test@example.com', 'Password123!')

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for suspended user', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue({ ...mockUser, isSuspended: true })

      // Act
      const result = await service.validateUser('test@example.com', 'Password123!')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh token with valid refresh token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token'
      prismaService.userSession.findUnique.mockResolvedValue({
        ...mockSession,
        refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          isActive: true,
          isSuspended: false,
        },
      })
      prismaService.userSession.update.mockResolvedValue(mockSession)

      // Act
      const result = await service.refreshToken(refreshToken)

      // Assert
      expect(result.accessToken).toBe('mock-access-token')
      expect(prismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: expect.objectContaining({
          refreshToken: 'random-bytes',
          expiresAt: expect.any(Date),
          lastUsedAt: expect.any(Date),
        }),
      })
    })

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      prismaService.userSession.findUnique.mockResolvedValue(null)

      // Act & Assert
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      )
    })

    it('should throw UnauthorizedException for expired refresh token', async () => {
      // Arrange
      prismaService.userSession.findUnique.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: mockUser,
      })

      // Act & Assert
      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      )
    })
  })

  describe('logout', () => {
    it('should successfully logout by deactivating session', async () => {
      // Arrange
      const sessionId = 'session-1'
      prismaService.userSession.update.mockResolvedValue(mockSession)

      // Act
      await service.logout(sessionId)

      // Assert
      expect(prismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { isActive: false },
      })
    })
  })

  describe('logoutAll', () => {
    it('should successfully logout all sessions for a user', async () => {
      // Arrange
      const userId = 'user-1'
      prismaService.userSession.updateMany.mockResolvedValue({ count: 3 })

      // Act
      await service.logoutAll(userId)

      // Assert
      expect(prismaService.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { isActive: false },
      })
    })
  })

  describe('getUserSessions', () => {
    it('should return active sessions for a user', async () => {
      // Arrange
      const userId = 'user-1'
      const sessions = [mockSession]
      prismaService.userSession.findMany.mockResolvedValue(sessions)

      // Act
      const result = await service.getUserSessions(userId)

      // Assert
      expect(result).toEqual(sessions)
      expect(prismaService.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: expect.any(Date) },
        },
        select: {
          id: true,
          deviceId: true,
          deviceName: true,
          deviceType: true,
          ipAddress: true,
          userAgent: true,
          lastUsedAt: true,
          createdAt: true,
          isActive: true,
        },
        orderBy: { lastUsedAt: 'desc' },
      })
    })
  })

  describe('revokeSession', () => {
    it('should successfully revoke a session', async () => {
      // Arrange
      const userId = 'user-1'
      const sessionId = 'session-1'
      prismaService.userSession.findFirst.mockResolvedValue(mockSession)
      prismaService.userSession.update.mockResolvedValue(mockSession)

      // Act
      await service.revokeSession(userId, sessionId)

      // Assert
      expect(prismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { isActive: false },
      })
    })

    it('should throw NotFoundException if session not found', async () => {
      // Arrange
      const userId = 'user-1'
      const sessionId = 'invalid-session'
      prismaService.userSession.findFirst.mockResolvedValue(null)

      // Act & Assert
      await expect(service.revokeSession(userId, sessionId)).rejects.toThrow(
        new NotFoundException('Session not found')
      )
    })
  })

  describe('requestPasswordReset', () => {
    it('should create password reset token for valid user', async () => {
      // Arrange
      const email = 'test@example.com'
      prismaService.user.findUnique.mockResolvedValue(mockUser)
      prismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 0 })
      prismaService.passwordResetToken.create.mockResolvedValue({
        id: 'token-1',
        userId: mockUser.id,
        token: 'reset-token',
        expiresAt: new Date(),
        isUsed: false,
        createdAt: new Date(),
      })

      // Act
      const result = await service.requestPasswordReset(email)

      // Assert
      expect(result.token).toBe('random-bytes')
      expect(prismaService.passwordResetToken.create).toHaveBeenCalled()
    })

    it('should throw NotFoundException for non-existent user', async () => {
      // Arrange
      const email = 'nonexistent@example.com'
      prismaService.user.findUnique.mockResolvedValue(null)

      // Act & Assert
      await expect(service.requestPasswordReset(email)).rejects.toThrow(
        new NotFoundException('If this email is registered, you will receive a reset link')
      )
    })
  })

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      // Arrange
      const token = 'valid-reset-token'
      const newPassword = 'NewPassword123!'
      const resetToken = {
        id: 'token-1',
        userId: mockUser.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        isUsed: false,
        user: mockUser,
      }
      
      prismaService.passwordResetToken.findUnique.mockResolvedValue(resetToken)
      ;(argon2.hash as jest.Mock).mockResolvedValue('new-hashed-password')
      prismaService.$transaction.mockResolvedValue([{}, {}, {}])

      // Act
      await service.resetPassword(token, newPassword)

      // Assert
      expect(prismaService.$transaction).toHaveBeenCalled()
      expect(argon2.hash).toHaveBeenCalledWith(
        newPassword + 'random-bytes',
        expect.objectContaining({
          type: argon2.argon2id,
        })
      )
    })

    it('should throw BadRequestException for invalid token', async () => {
      // Arrange
      const token = 'invalid-token'
      const newPassword = 'NewPassword123!'
      prismaService.passwordResetToken.findUnique.mockResolvedValue(null)

      // Act & Assert
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        new BadRequestException('Invalid or expired reset token')
      )
    })

    it('should throw BadRequestException for expired token', async () => {
      // Arrange
      const token = 'expired-token'
      const newPassword = 'NewPassword123!'
      const resetToken = {
        id: 'token-1',
        userId: mockUser.id,
        token,
        expiresAt: new Date(Date.now() - 1000), // Expired
        isUsed: false,
        user: mockUser,
      }
      
      prismaService.passwordResetToken.findUnique.mockResolvedValue(resetToken)

      // Act & Assert
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        new BadRequestException('Invalid or expired reset token')
      )
    })

    it('should throw BadRequestException for used token', async () => {
      // Arrange
      const token = 'used-token'
      const newPassword = 'NewPassword123!'
      const resetToken = {
        id: 'token-1',
        userId: mockUser.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: true, // Already used
        user: mockUser,
      }
      
      prismaService.passwordResetToken.findUnique.mockResolvedValue(resetToken)

      // Act & Assert
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        new BadRequestException('Invalid or expired reset token')
      )
    })
  })

  describe('validateSession', () => {
    it('should return session for valid session ID', async () => {
      // Arrange
      const sessionId = 'session-1'
      const validSession = {
        id: sessionId,
        isActive: true,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: {
          isActive: true,
          isSuspended: false,
        },
      }
      prismaService.userSession.findUnique.mockResolvedValue(validSession)

      // Act
      const result = await service.validateSession(sessionId)

      // Assert
      expect(result).toEqual(validSession)
    })

    it('should return null for invalid session', async () => {
      // Arrange
      const sessionId = 'invalid-session'
      prismaService.userSession.findUnique.mockResolvedValue(null)

      // Act
      const result = await service.validateSession(sessionId)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for expired session', async () => {
      // Arrange
      const sessionId = 'expired-session'
      const expiredSession = {
        id: sessionId,
        isActive: true,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: {
          isActive: true,
          isSuspended: false,
        },
      }
      prismaService.userSession.findUnique.mockResolvedValue(expiredSession)

      // Act
      const result = await service.validateSession(sessionId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('updateSessionLastUsed', () => {
    it('should update session last used timestamp', async () => {
      // Arrange
      const sessionId = 'session-1'
      prismaService.userSession.update.mockResolvedValue(mockSession)

      // Act
      await service.updateSessionLastUsed(sessionId)

      // Assert
      expect(prismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { lastUsedAt: expect.any(Date) },
      })
    })
  })
})