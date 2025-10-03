import { Test, TestingModule } from '@nestjs/testing'
import { WebSocketService } from './websocket.service'
import { Server } from 'socket.io'
import Redis from 'ioredis'

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    scard: jest.fn().mockResolvedValue(0),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }))
})

describe('WebSocketService', () => {
  let service: WebSocketService
  let mockServer: jest.Mocked<Server>
  let mockSocket: any

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebSocketService],
    }).compile()

    service = module.get<WebSocketService>(WebSocketService)
    
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any

    mockSocket = {
      id: 'socket-123',
      userId: 'user-123',
      user: { id: 'user-123', username: 'testuser', name: 'Test User' },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    }

    service.setServer(mockServer)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('joinRoom', () => {
    it('should successfully join a room', async () => {
      await service.joinRoom(mockSocket, 'conversation-123')

      expect(mockSocket.join).toHaveBeenCalledWith('conversation:conversation-123')
    })

    it('should handle join room errors', async () => {
      mockSocket.join.mockRejectedValue(new Error('Join failed'))

      await service.joinRoom(mockSocket, 'conversation-123')

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'JOIN_ROOM_FAILED',
        message: 'Failed to join conversation'
      })
    })
  })

  describe('leaveRoom', () => {
    it('should successfully leave a room', async () => {
      await service.leaveRoom(mockSocket, 'conversation-123')

      expect(mockSocket.leave).toHaveBeenCalledWith('conversation:conversation-123')
    })
  })

  describe('broadcastToConversation', () => {
    it('should broadcast message to conversation room', () => {
      const testMessage = { id: 'msg-123', content: 'Hello' }

      service.broadcastToConversation('conversation-123', 'message-new', testMessage)

      expect(mockServer.to).toHaveBeenCalledWith('conversation:conversation-123')
      expect(mockServer.emit).toHaveBeenCalledWith('message-new', testMessage)
    })

    it('should handle missing server gracefully', () => {
      service.setServer(null as any)
      
      // Should not throw
      service.broadcastToConversation('conversation-123', 'message-new', {})
    })
  })

  describe('broadcastNewMessage', () => {
    it('should publish new message to Redis', async () => {
      const message = {
        id: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Hello',
        type: 'text' as const,
        attachments: [],
        createdAt: new Date(),
      }

      await service.broadcastNewMessage(message)

      // Redis publish should be called (mocked)
      expect(service['pubClient'].publish).toHaveBeenCalledWith(
        'message:new',
        JSON.stringify({ conversationId: message.conversationId, message })
      )
    })
  })

  describe('getUserSocketIds', () => {
    it('should return user socket IDs from Redis', async () => {
      const mockSocketIds = ['socket-1', 'socket-2']
      service['redis'].smembers = jest.fn().mockResolvedValue(mockSocketIds)

      const result = await service.getUserSocketIds('user-123')

      expect(result).toEqual(mockSocketIds)
      expect(service['redis'].smembers).toHaveBeenCalledWith('user:user-123:sockets')
    })
  })

  describe('isUserOnline', () => {
    it('should return true when user has active sockets', async () => {
      service['redis'].scard = jest.fn().mockResolvedValue(2)

      const result = await service.isUserOnline('user-123')

      expect(result).toBe(true)
      expect(service['redis'].scard).toHaveBeenCalledWith('user:user-123:sockets')
    })

    it('should return false when user has no active sockets', async () => {
      service['redis'].scard = jest.fn().mockResolvedValue(0)

      const result = await service.isUserOnline('user-123')

      expect(result).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should quit all Redis connections', async () => {
      await service.cleanup()

      expect(service['redis'].quit).toHaveBeenCalled()
      expect(service['pubClient'].quit).toHaveBeenCalled()
      expect(service['subClient'].quit).toHaveBeenCalled()
    })
  })
})