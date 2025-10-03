import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'
import { AuthService } from '../auth.service'
import { JwtPayload } from '../interfaces/auth.interface'

describe('JwtStrategy', () => {
  let strategy: JwtStrategy
  let authService: jest.Mocked<AuthService>

  const mockPayload: JwtPayload = {
    sub: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    sessionId: 'session-1',
  }

  const mockSession = {
    id: 'session-1',
    isActive: true,
    expiresAt: new Date(Date.now() + 1000000),
    user: {
      isActive: true,
      isSuspended: false,
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateSession: jest.fn(),
            updateSessionLastUsed: jest.fn(),
          },
        },
      ],
    }).compile()

    strategy = module.get<JwtStrategy>(JwtStrategy)
    authService = module.get(AuthService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validate', () => {
    it('should return user data for valid JWT payload', async () => {
      authService.validateSession.mockResolvedValue(mockSession)
      authService.updateSessionLastUsed.mockResolvedValue()

      const result = await strategy.validate(mockPayload)

      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        sessionId: 'session-1',
      })
      expect(authService.validateSession).toHaveBeenCalledWith('session-1')
      expect(authService.updateSessionLastUsed).toHaveBeenCalledWith('session-1')
    })

    it('should throw UnauthorizedException for invalid session', async () => {
      authService.validateSession.mockResolvedValue(null)

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('Session expired or invalid'),
      )
      expect(authService.updateSessionLastUsed).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException for expired session', async () => {
      // The AuthService.validateSession should return null for expired sessions
      authService.validateSession.mockResolvedValue(null)

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('Session expired or invalid'),
      )
    })
  })
})