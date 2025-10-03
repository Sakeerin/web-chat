import { Test, TestingModule } from '@nestjs/testing'
import { TypingService } from './typing.service'

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    pipeline: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    publish: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  }))
})

describe('TypingService', () => {
  let service: TypingService
  let mockSocket: any

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TypingService],
    }).compile()

    service = module.get<TypingService>(TypingService)
    
    mockSocket = {
      id: 'socket-123',
      userId: 'user-123',
      user: { id: 'user-123', username: 'testuser', name: 'Test User' },
    }

    // Clear any existing timeouts
    service['typingTimeouts'].clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
    // Clear timeouts to prevent test interference
    service['typingTimeouts'].forEach(timeout => clearTimeout(timeout))
    service['typingTimeouts'].clear()
  })

  describe('startTyping', () => {
    it('should set typing status in Redis', async () => {
      await service.startTyping(mockSocket, 'conversation-123')

      expect(service['redis'].setex).toHaveBeenCalledWith(
        'typing:conversation-123:user-123',
        10,
        expect.stringContaining('"isTyping":true')
      )
      expect(service['pubClient'].publish).toHaveBeenCalledWith(
        'typing:start',
        expect.stringContaining('"conversationId":"conversation-123"')
      )
    })

    it('should set auto-stop timeout', async () => {
      jest.useFakeTimers()
      
      await service.startTyping(mockSocket, 'conversation-123')

      // Check that timeout was set
      expect(service['typingTimeouts'].has('conversation-123:user-123')).toBe(true)

      jest.useRealTimers()
    })

    it('should clear existing timeout before setting new one', async () => {
      jest.useFakeTimers()
      
      // Start typing first time
      await service.startTyping(mockSocket, 'conversation-123')
      const firstTimeoutId = service['typingTimeouts'].get('conversation-123:user-123')
      
      // Start typing again
      await service.startTyping(mockSocket, 'conversation-123')
      const secondTimeoutId = service['typingTimeouts'].get('conversation-123:user-123')
      
      // Should be different timeout IDs
      expect(firstTimeoutId).not.toBe(secondTimeoutId)

      jest.useRealTimers()
    })

    it('should handle Redis errors gracefully', async () => {
      service['redis'].setex = jest.fn().mockRejectedValue(new Error('Redis error'))

      // Should not throw
      await expect(service.startTyping(mockSocket, 'conversation-123')).resolves.toBeUndefined()
    })
  })

  describe('stopTyping', () => {
    it('should remove typing status from Redis', async () => {
      await service.stopTyping(mockSocket, 'conversation-123')

      expect(service['redis'].del).toHaveBeenCalledWith('typing:conversation-123:user-123')
      expect(service['pubClient'].publish).toHaveBeenCalledWith(
        'typing:stop',
        expect.stringContaining('"conversationId":"conversation-123"')
      )
    })

    it('should clear timeout when stopping typing', async () => {
      jest.useFakeTimers()
      
      // Start typing to set timeout
      await service.startTyping(mockSocket, 'conversation-123')
      expect(service['typingTimeouts'].has('conversation-123:user-123')).toBe(true)
      
      // Stop typing
      await service.stopTyping(mockSocket, 'conversation-123')
      expect(service['typingTimeouts'].has('conversation-123:user-123')).toBe(false)

      jest.useRealTimers()
    })
  })

  describe('getTypingUsers', () => {
    it('should return typing users for conversation', async () => {
      const mockKeys = ['typing:conversation-123:user-1', 'typing:conversation-123:user-2']
      const mockTypingData = [
        { userId: 'user-1', conversationId: 'conversation-123', isTyping: true, lastTypingAt: new Date() },
        { userId: 'user-2', conversationId: 'conversation-123', isTyping: true, lastTypingAt: new Date() }
      ]

      service['redis'].keys = jest.fn().mockResolvedValue(mockKeys)
      service['redis'].pipeline = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify(mockTypingData[0])],
          [null, JSON.stringify(mockTypingData[1])]
        ])
      })

      const result = await service.getTypingUsers('conversation-123')

      expect(result).toHaveLength(2)
      expect(result[0].userId).toBe('user-1')
      expect(result[1].userId).toBe('user-2')
    })

    it('should return empty array when no typing users', async () => {
      service['redis'].keys = jest.fn().mockResolvedValue([])

      const result = await service.getTypingUsers('conversation-123')

      expect(result).toEqual([])
    })

    it('should handle Redis errors', async () => {
      service['redis'].keys = jest.fn().mockRejectedValue(new Error('Redis error'))

      const result = await service.getTypingUsers('conversation-123')

      expect(result).toEqual([])
    })
  })

  describe('isUserTyping', () => {
    it('should return true when user is typing', async () => {
      service['redis'].get = jest.fn().mockResolvedValue('{"isTyping":true}')

      const result = await service.isUserTyping('user-123', 'conversation-123')

      expect(result).toBe(true)
      expect(service['redis'].get).toHaveBeenCalledWith('typing:conversation-123:user-123')
    })

    it('should return false when user is not typing', async () => {
      service['redis'].get = jest.fn().mockResolvedValue(null)

      const result = await service.isUserTyping('user-123', 'conversation-123')

      expect(result).toBe(false)
    })
  })

  describe('clearUserTyping', () => {
    it('should clear all typing statuses for user', async () => {
      const mockKeys = ['typing:conv-1:user-123', 'typing:conv-2:user-123']
      service['redis'].keys = jest.fn().mockResolvedValue(mockKeys)

      await service.clearUserTyping(mockSocket)

      expect(service['redis'].del).toHaveBeenCalledWith(...mockKeys)
      expect(service['pubClient'].publish).toHaveBeenCalledTimes(2)
    })

    it('should clear all timeouts for user', async () => {
      jest.useFakeTimers()
      
      // Set up some timeouts
      service['typingTimeouts'].set('conv-1:user-123', setTimeout(() => {}, 1000))
      service['typingTimeouts'].set('conv-2:user-123', setTimeout(() => {}, 1000))
      service['typingTimeouts'].set('conv-1:user-456', setTimeout(() => {}, 1000)) // Different user
      
      service['redis'].keys = jest.fn().mockResolvedValue([])

      await service.clearUserTyping(mockSocket)

      // Should only clear timeouts for user-123
      expect(service['typingTimeouts'].has('conv-1:user-123')).toBe(false)
      expect(service['typingTimeouts'].has('conv-2:user-123')).toBe(false)
      expect(service['typingTimeouts'].has('conv-1:user-456')).toBe(true) // Should remain

      jest.useRealTimers()
    })
  })

  describe('cleanup', () => {
    it('should clear all timeouts and quit Redis connections', async () => {
      jest.useFakeTimers()
      
      // Set up some timeouts
      service['typingTimeouts'].set('test-1', setTimeout(() => {}, 1000))
      service['typingTimeouts'].set('test-2', setTimeout(() => {}, 1000))

      await service.cleanup()

      expect(service['typingTimeouts'].size).toBe(0)
      expect(service['redis'].quit).toHaveBeenCalled()
      expect(service['pubClient'].quit).toHaveBeenCalled()

      jest.useRealTimers()
    })
  })
})