import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { io, Socket as ClientSocket } from 'socket.io-client'
import { WebSocketModule } from './websocket.module'
import { DatabaseModule } from '../database/database.module'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { ConversationsModule } from '../conversations/conversations.module'

describe('WebSocket Integration', () => {
  let app: INestApplication
  let jwtService: JwtService
  let clientSocket: ClientSocket
  let clientSocket2: ClientSocket
  let serverPort: number

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        WebSocketModule,
        DatabaseModule,
        AuthModule,
        UsersModule,
        ConversationsModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    jwtService = moduleFixture.get<JwtService>(JwtService)
    
    await app.listen(0) // Use random available port
    const server = app.getHttpServer()
    const address = server.address()
    serverPort = typeof address === 'string' ? parseInt(address) : address?.port || 3001
  })

  afterAll(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect()
    }
    if (clientSocket2?.connected) {
      clientSocket2.disconnect()
    }
    await app.close()
  })

  beforeEach(() => {
    // Clean up any existing connections
    if (clientSocket?.connected) {
      clientSocket.disconnect()
    }
    if (clientSocket2?.connected) {
      clientSocket2.disconnect()
    }
  })

  describe('Connection and Authentication', () => {
    it('should connect and authenticate successfully', (done) => {
      const token = jwtService.sign({ 
        sub: 'user-123', 
        username: 'testuser',
        name: 'Test User'
      })

      clientSocket = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      clientSocket.on('connect', () => {
        clientSocket.emit('auth', token)
      })

      clientSocket.on('auth-success', (data) => {
        expect(data.userId).toBe('user-123')
        done()
      })

      clientSocket.on('error', (error) => {
        done(new Error(`Authentication failed: ${error.message}`))
      })

      clientSocket.connect()
    })

    it('should reject invalid token', (done) => {
      clientSocket = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      clientSocket.on('connect', () => {
        clientSocket.emit('auth', 'invalid-token')
      })

      clientSocket.on('error', (error) => {
        expect(error.code).toBe('AUTH_FAILED')
        done()
      })

      clientSocket.on('auth-success', () => {
        done(new Error('Should not authenticate with invalid token'))
      })

      clientSocket.connect()
    })

    it('should disconnect unauthenticated clients after timeout', (done) => {
      clientSocket = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      clientSocket.on('connect', () => {
        // Don't send auth token
      })

      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBe('server namespace disconnect')
        done()
      })

      clientSocket.on('error', (error) => {
        if (error.code === 'AUTH_TIMEOUT') {
          // Expected behavior
        }
      })

      clientSocket.connect()
    }, 15000) // Increase timeout for this test
  })

  describe('Room Management', () => {
    let authToken: string

    beforeEach((done) => {
      authToken = jwtService.sign({ 
        sub: 'user-123', 
        username: 'testuser',
        name: 'Test User'
      })

      clientSocket = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      clientSocket.on('connect', () => {
        clientSocket.emit('auth', authToken)
      })

      clientSocket.on('auth-success', () => {
        done()
      })

      clientSocket.connect()
    })

    it('should join and leave rooms successfully', (done) => {
      const conversationId = 'conversation-123'
      let joinedRoom = false

      clientSocket.on('room-joined', (data) => {
        expect(data.conversationId).toBe(conversationId)
        joinedRoom = true
        
        // Now leave the room
        clientSocket.emit('leave-room', conversationId)
      })

      clientSocket.on('room-left', (data) => {
        expect(data.conversationId).toBe(conversationId)
        expect(joinedRoom).toBe(true)
        done()
      })

      clientSocket.emit('join-room', conversationId)
    })

    it('should handle join room errors gracefully', (done) => {
      clientSocket.on('error', (error) => {
        if (error.code === 'JOIN_ROOM_FAILED') {
          done()
        }
      })

      // Try to join with invalid conversation ID format
      clientSocket.emit('join-room', '')
    })
  })

  describe('Typing Indicators', () => {
    let authToken1: string
    let authToken2: string

    beforeEach((done) => {
      authToken1 = jwtService.sign({ 
        sub: 'user-123', 
        username: 'testuser1',
        name: 'Test User 1'
      })
      
      authToken2 = jwtService.sign({ 
        sub: 'user-456', 
        username: 'testuser2',
        name: 'Test User 2'
      })

      let authenticatedCount = 0

      const checkBothAuthenticated = () => {
        authenticatedCount++
        if (authenticatedCount === 2) {
          done()
        }
      }

      // Set up first client
      clientSocket = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      clientSocket.on('connect', () => {
        clientSocket.emit('auth', authToken1)
      })

      clientSocket.on('auth-success', checkBothAuthenticated)

      // Set up second client
      clientSocket2 = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      clientSocket2.on('connect', () => {
        clientSocket2.emit('auth', authToken2)
      })

      clientSocket2.on('auth-success', checkBothAuthenticated)

      clientSocket.connect()
      clientSocket2.connect()
    })

    it('should broadcast typing indicators between users', (done) => {
      const conversationId = 'conversation-123'
      let bothJoined = false
      let joinCount = 0

      const checkBothJoined = () => {
        joinCount++
        if (joinCount === 2) {
          bothJoined = true
          // Start typing from first user
          clientSocket.emit('typing-start', conversationId)
        }
      }

      // Both users join the same conversation
      clientSocket.on('room-joined', checkBothJoined)
      clientSocket2.on('room-joined', checkBothJoined)

      // Second user should receive typing indicator
      clientSocket2.on('typing', (userId, convId) => {
        expect(userId).toBe('user-123')
        expect(convId).toBe(conversationId)
        expect(bothJoined).toBe(true)
        done()
      })

      clientSocket.emit('join-room', conversationId)
      clientSocket2.emit('join-room', conversationId)
    })

    it('should handle typing stop events', (done) => {
      const conversationId = 'conversation-123'
      let typingStartReceived = false

      // Both users join the conversation first
      Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.on('room-joined', () => resolve())
          clientSocket.emit('join-room', conversationId)
        }),
        new Promise<void>((resolve) => {
          clientSocket2.on('room-joined', () => resolve())
          clientSocket2.emit('join-room', conversationId)
        })
      ]).then(() => {
        // Set up typing stop listener
        clientSocket2.on('typing-stop', (userId, convId) => {
          expect(userId).toBe('user-123')
          expect(convId).toBe(conversationId)
          expect(typingStartReceived).toBe(true)
          done()
        })

        // Set up typing start listener
        clientSocket2.on('typing', (userId, convId) => {
          typingStartReceived = true
          // Stop typing after receiving start
          clientSocket.emit('typing-stop', conversationId)
        })

        // Start typing
        clientSocket.emit('typing-start', conversationId)
      })
    })
  })

  describe('Presence Updates', () => {
    let authToken: string

    beforeEach((done) => {
      authToken = jwtService.sign({ 
        sub: 'user-123', 
        username: 'testuser',
        name: 'Test User'
      })

      clientSocket = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      clientSocket.on('connect', () => {
        clientSocket.emit('auth', authToken)
      })

      clientSocket.on('auth-success', () => {
        done()
      })

      clientSocket.connect()
    })

    it('should handle presence updates', (done) => {
      clientSocket.on('presence', (userId, status) => {
        expect(userId).toBe('user-123')
        expect(status).toBe('away')
        done()
      })

      clientSocket.emit('presence-update', 'away')
    })

    it('should respond to heartbeat', (done) => {
      clientSocket.on('heartbeat-ack', () => {
        done()
      })

      clientSocket.emit('heartbeat')
    })
  })

  describe('Error Handling', () => {
    let authToken: string

    beforeEach((done) => {
      authToken = jwtService.sign({ 
        sub: 'user-123', 
        username: 'testuser',
        name: 'Test User'
      })

      clientSocket = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      clientSocket.on('connect', () => {
        clientSocket.emit('auth', authToken)
      })

      clientSocket.on('auth-success', () => {
        done()
      })

      clientSocket.connect()
    })

    it('should handle unauthenticated requests', (done) => {
      // Create a new socket without authentication
      const unauthSocket = io(`http://localhost:${serverPort}`, {
        autoConnect: false,
      })

      unauthSocket.on('connect', () => {
        // Try to join room without authentication
        unauthSocket.emit('join-room', 'conversation-123')
      })

      unauthSocket.on('error', (error) => {
        expect(error.code).toBe('NOT_AUTHENTICATED')
        unauthSocket.disconnect()
        done()
      })

      unauthSocket.connect()
    })
  })
})