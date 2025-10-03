import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { LocalStrategy } from './local.strategy'
import { AuthService } from '../auth.service'

describe('LocalStrategy', () => {
  let strategy: LocalStrategy
  let authService: jest.Mocked<AuthService>

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: null,
    isVerified: false,
    isActive: true,
    isSuspended: false,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile()

    strategy = module.get<LocalStrategy>(LocalStrategy)
    authService = module.get(AuthService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validate', () => {
    it('should return user data for valid credentials', async () => {
      authService.validateUser.mockResolvedValue(mockUser)

      const result = await strategy.validate('test@example.com', 'password')

      expect(result).toEqual(mockUser)
      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password')
    })

    it('should throw UnauthorizedException for invalid credentials', async () => {
      authService.validateUser.mockResolvedValue(null)

      await expect(
        strategy.validate('test@example.com', 'wrong-password'),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'))
    })

    it('should throw UnauthorizedException for non-existent user', async () => {
      authService.validateUser.mockResolvedValue(null)

      await expect(
        strategy.validate('nonexistent@example.com', 'password'),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'))
    })
  })
})