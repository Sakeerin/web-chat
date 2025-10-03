import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from './prisma.service'

describe('PrismaService', () => {
  let service: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile()

    service = module.get<PrismaService>(PrismaService)
  })

  afterEach(async () => {
    await service.$disconnect()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should have database connection methods', () => {
    expect(service.$connect).toBeDefined()
    expect(service.$disconnect).toBeDefined()
    expect(service.isHealthy).toBeDefined()
    expect(service.getStats).toBeDefined()
  })

  it('should provide access to all models', () => {
    expect(service.user).toBeDefined()
    expect(service.conversation).toBeDefined()
    expect(service.message).toBeDefined()
    expect(service.attachment).toBeDefined()
    expect(service.conversationMember).toBeDefined()
    expect(service.messageReceipt).toBeDefined()
    expect(service.contactRequest).toBeDefined()
    expect(service.userSession).toBeDefined()
    expect(service.blockedUser).toBeDefined()
    expect(service.userReport).toBeDefined()
    expect(service.messageEdit).toBeDefined()
    expect(service.auditLog).toBeDefined()
  })

  // Note: These tests require a running database
  // They should be run in integration test environment
  describe('Database Operations (Integration)', () => {
    it('should check health status', async () => {
      // This test requires database connection
      // Skip in unit test environment
      if (process.env.NODE_ENV === 'test') {
        return
      }

      const isHealthy = await service.isHealthy()
      expect(typeof isHealthy).toBe('boolean')
    })

    it('should get database statistics', async () => {
      // This test requires database connection
      // Skip in unit test environment
      if (process.env.NODE_ENV === 'test') {
        return
      }

      const stats = await service.getStats()
      expect(stats).toHaveProperty('users')
      expect(stats).toHaveProperty('conversations')
      expect(stats).toHaveProperty('messages')
      expect(stats).toHaveProperty('timestamp')
      expect(typeof stats.users).toBe('number')
      expect(typeof stats.conversations).toBe('number')
      expect(typeof stats.messages).toBe('number')
    })
  })
})