import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'

interface ServerToClientEvents {
  'message-new': (message: any) => void
  'message-ack': (tempId: string, messageId: string) => void
  'message-edited': (message: any) => void
  'message-deleted': (messageId: string) => void
  'typing': (userId: string, conversationId: string) => void
  'typing-stop': (userId: string, conversationId: string) => void
  'presence': (userId: string, status: 'online' | 'offline') => void
  'receipt': (messageId: string, userId: string, type: 'delivered' | 'seen') => void
  'conversation-updated': (conversation: any) => void
  'user-joined': (conversationId: string, user: any) => void
  'user-left': (conversationId: string, userId: string) => void
  'error': (error: { code: string; message: string }) => void
  'connect': () => void
  'disconnect': (reason: string) => void
  'reconnect': (attemptNumber: number) => void
  'reconnect_error': (error: Error) => void
}

interface ClientToServerEvents {
  'auth': (token: string) => void
  'join-room': (conversationId: string) => void
  'leave-room': (conversationId: string) => void
  'send-message': (message: any) => void
  'typing-start': (conversationId: string) => void
  'typing-stop': (conversationId: string) => void
  'presence-update': (status: 'online' | 'offline') => void
  'mark-as-read': (conversationId: string, messageId: string) => void
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isManualDisconnect = false

  connect(token: string): void {
    if (this.socket?.connected) {
      return
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    
    this.socket = io(apiUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    })

    this.setupEventListeners()
    this.isManualDisconnect = false
  }

  disconnect(): void {
    this.isManualDisconnect = true
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    useChatStore.getState().setConnected(false)
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected')
      this.reconnectAttempts = 0
      useChatStore.getState().setConnected(true)
      
      // Re-authenticate on reconnect
      const token = useAuthStore.getState().accessToken
      if (token) {
        this.socket?.emit('auth', token)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      useChatStore.getState().setConnected(false)
      
      // Don't attempt to reconnect if it was a manual disconnect
      if (this.isManualDisconnect) {
        return
      }
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        this.handleReconnect()
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts')
      this.reconnectAttempts = 0
      useChatStore.getState().setConnected(true)
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection failed:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
        // Could trigger a user notification here
      }
    })

    // Message events
    this.socket.on('message-new', (message) => {
      useChatStore.getState().addMessage(message)
      // Update conversation's last message
      useChatStore.getState().updateConversation(message.conversationId, {
        lastMessage: message,
        updatedAt: message.createdAt,
      })
    })

    this.socket.on('message-ack', (tempId, messageId) => {
      // Handle message acknowledgment for optimistic updates
      console.log('Message acknowledged:', tempId, '->', messageId)
    })

    this.socket.on('message-edited', (message) => {
      useChatStore.getState().updateMessage(message.id, message)
    })

    this.socket.on('message-deleted', (messageId) => {
      useChatStore.getState().removeMessage(messageId)
    })

    // Typing events
    this.socket.on('typing', (userId, conversationId) => {
      // Don't show typing indicator for current user
      const currentUserId = useAuthStore.getState().user?.id
      if (userId !== currentUserId) {
        useChatStore.getState().addTypingUser({
          userId,
          username: '', // Would need to fetch username or include in event
          conversationId,
        })
      }
    })

    this.socket.on('typing-stop', (userId, conversationId) => {
      useChatStore.getState().removeTypingUser(userId, conversationId)
    })

    // Presence events
    this.socket.on('presence', (userId, status) => {
      if (status === 'online') {
        useChatStore.getState().addOnlineUser(userId)
      } else {
        useChatStore.getState().removeOnlineUser(userId)
      }
    })

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
      // Could trigger user notification or error handling
    })
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    )

    setTimeout(() => {
      if (!this.socket?.connected && !this.isManualDisconnect) {
        const token = useAuthStore.getState().accessToken
        if (token) {
          this.connect(token)
        }
      }
    }, delay)

    this.reconnectAttempts++
  }

  // Message operations
  sendMessage(message: any): void {
    if (this.socket?.connected) {
      this.socket.emit('send-message', message)
    } else {
      console.error('Socket not connected, cannot send message')
    }
  }

  joinRoom(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-room', conversationId)
    }
  }

  leaveRoom(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', conversationId)
    }
  }

  startTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing-start', conversationId)
    }
  }

  stopTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing-stop', conversationId)
    }
  }

  markAsRead(conversationId: string, messageId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('mark-as-read', conversationId, messageId)
    }
  }

  updatePresence(status: 'online' | 'offline'): void {
    if (this.socket?.connected) {
      this.socket.emit('presence-update', status)
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export const socketService = new SocketService()