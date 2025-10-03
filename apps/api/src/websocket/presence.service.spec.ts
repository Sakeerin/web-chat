import { Test, TestingModule } from '@nestjs/testing'
import { PresenceService } from './presence.service'
import { PresenceStatus } from './interfaces/websocket.interface'

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    publish: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  }))
})

describe('PresenceService', () => {
  let service: PresenceService
  let mockSocket: any

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PresenceService],
    }).compile()

    service = module.get<PresenceService>(PresenceService)
    
    mockSocket = {
      id: 'socket-123',
      userId: 'user-123',
      user: { id: 'user-123', username: 'testuser', name: 'Test User' },
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('setUserPresence', () => {
    it('should set user presence for new user', async () => {
      const status: PresenceStatus = 'online'
      service['redis'].get = jest.fn().mockResolvedValue(null)

      await service.setUserPresence('user-123', 'socket-123', status)

      expect(service['redis'].setex).toHaveBeenCalledWith(
        'presence:user-123',
        3600,
        expect.stringContaining('"status":"online"')
      )
      expect(service['pubClient'].publish).toHaveBeenCalledWith(
        'presence:update',
        expect.stringContaining('"status":"online"')
      )
    })

    it('should update existing user presence', async () => {
      const existingPresence = {
        userId: 'user-123',
        status: 'away',
        lastSeenAt: new Date(),
        socketIds: ['socket-456']
      }
      service['redis'].get = jest.fn().mockResolvedValue(JSON.stringify(existingPresence))

      await service.setUserPresence('user-123', 'socket-123', 'online')

      expect(service['redis'].setex).toHaveBeenCalledWith(
        'presence:user-123',
        3600,
        expect.stringContaining('"socketIds":["socket-456","socket-123"]')
      )
    })

    it('should handle Redis errors gracefully', async () => {
      service['redis'].get = jest.fn().mockRejectedValue(new Error('Redis error'))

      // Should not throw
      await expect(service.setUserPresence('user-123', 'socket-123', 'online')).resolves.toBeUndefined()
    })
  })

  describe('removeUserSocket', () => {
    it('should set user offline when no sockets remain', async () => {
      const presenceData = {
        userId: 'user-123',
        status: 'online',
        lastSeenAt: new Date(),
        socketIds: ['socket-123']
      }
      service['redis'].get = jest.fn().mockResolvedValue(JSON.stringify(presenceData))

      await service.removeUserSocket('user-123', 'socket-123')

      expect(service['redis'].setex).toHaveBeenCalledWith(
        'presence:user-123',
        300, // 5 minutes for offline status
        expect.stringContaining('"status":"offline"')
      )
      expect(service['pubClient'].publish).toHaveBeenCalledWith(
        'presence:update',
        expect.stringContaining('"status":"offline"')
      )
    })

    it('should keep user online when other sockets remain', async () => {
      const presenceData = {
        userId: 'user-123',
        status: 'online',
        lastSeenAt: new Date(),
        socketIds: ['socket-123', 'socket-456']
      }
      service['redis'].get = jest.fn().mockResolvedValue(JSON.stringify(presenceData))

      await service.removeUserSocket('user-123', 'socket-123')

      expect(service['redis'].setex).toHaveBeenCalledWith(
        'presence:user-123',
        3600, // Normal TTL
        expect.stringContaining('"socketIds":["socket-456"]')
      )
    })
  })

  describe('getUserPresence', () => {
    it('should return user presence data', async () => {
      const presenceData = {
        userId: 'user-123',
        status: 'online',
        lastSeenAt: new Date(),
        socketIds: ['socket-123']
      }
      service['redis'].get = jest.fn().mockResolvedValue(JSON.stringify(presenceData))

      const result = await service.getUserPresence('user-123')

      expect(result?.userId).toBe(presenceData.userId)
      expect(result?.status).toBe(presenceData.status)
      expect(result?.socketIds).toEqual(presenceData.socketIds)
      expect(service['redis'].get).toHaveBeenCalledWith('presence:user-123')
    })

    it('should return null when no presence data exists', async () => {
      service['redis'].get = jest.fn().mockResolvedValue(null)

      const result = await service.getUserPresence('user-123')

      expect(result).toBeNull()
    })

    it('should handle Redis errors', async () => {
      service['redis'].get = jest.fn().mockRejectedValue(new Error('Redis error'))

      const result = await service.getUserPresence('user-123')

      expect(result).toBeNull()
    })
  })

  describe('isUserOnline', () => {
    it('should return true for online user with sockets', async () => {
      const presenceData = {
        userId: 'user-123',
        status: 'online',
        lastSeenAt: new Date(),
        socketIds: ['socket-123']
      }
      service['redis'].get = jest.fn().mockResolvedValue(JSON.stringify(presenceData))

      const result = await service.isUserOnline('user-123')

      expect(result).toBe(true)
    })

    it('should return false for offline user', async () => {
      const presenceData = {
        userId: 'user-123',
        status: 'offline',
        lastSeenAt: new Date(),
        socketIds: []
      }
      service['redis'].get = jest.fn().mockResolvedValue(JSON.stringify(presenceData))

      const result = await service.isUserOnline('user-123')

      expect(result).toBe(false)
    })

    it('should return false when no presence data exists', async () => {
      service['redis'].get = jest.fn().mockResolvedValue(null)

      const result = await service.isUserOnline('user-123')

      expect(result).toBe(false)
    })
  })

  describe('heartbeat', () => {
    it('should update user presence to online', async () => {
      await service.heartbeat(mockSocket)

      expect(service['redis'].setex).toHaveBeenCalledWith(
        'presence:user-123',
        3600,
        expect.stringContaining('"status":"online"')
      )
    })
  })

  describe('cleanup', () => {
    it('should quit Redis connections', async () => {
      await service.cleanup()

      expect(service['redis'].quit).toHaveBeenCalled()
      expect(service['pubClient'].quit).toHaveBeenCalled()
    })
  })
})