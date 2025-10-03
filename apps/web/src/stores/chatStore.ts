import { create } from 'zustand'
import type { ConversationWithMembers, Message } from '@shared/types'



interface Conversation extends ConversationWithMembers {
  description?: string
  ownerId?: string
  isArchived: boolean
  settings: Record<string, any>
}

interface TypingUser {
  userId: string
  username: string
  conversationId: string
}

interface ChatState {
  // Current conversation
  activeConversationId: string | null
  conversations: Conversation[]
  messages: Record<string, Message[]>
  
  // Real-time state
  typingUsers: TypingUser[]
  onlineUsers: Set<string>
  
  // UI state
  isConnected: boolean
  isLoading: boolean
  
  // Actions
  setActiveConversation: (conversationId: string | null) => void
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void
  
  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (message: Message | any) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  removeMessage: (messageId: string) => void
  
  setTypingUsers: (users: TypingUser[]) => void
  addTypingUser: (user: TypingUser) => void
  removeTypingUser: (userId: string, conversationId: string) => void
  
  setOnlineUsers: (users: string[]) => void
  addOnlineUser: (userId: string) => void
  removeOnlineUser: (userId: string) => void
  
  setConnected: (connected: boolean) => void
  setLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  // Initial state
  activeConversationId: null,
  conversations: [],
  messages: {},
  typingUsers: [],
  onlineUsers: new Set(),
  isConnected: false,
  isLoading: false,

  // Actions
  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId })
  },

  setConversations: (conversations) => {
    set({ conversations })
  },

  addConversation: (conversation) => {
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }))
  },

  updateConversation: (conversationId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ),
    }))
  },

  setMessages: (conversationId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages,
      },
    }))
  },

  addMessage: (message) => {
    set((state) => {
      const conversationId = message.conversationId || ''
      const conversationMessages = state.messages[conversationId] || []
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...conversationMessages, message],
        },
      }
    })
  },

  updateMessage: (messageId, updates) => {
    set((state) => {
      const newMessages = { ...state.messages }
      Object.keys(newMessages).forEach((conversationId) => {
        const messages = newMessages[conversationId]
        if (messages) {
          newMessages[conversationId] = messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }
      })
      return { messages: newMessages }
    })
  },

  removeMessage: (messageId) => {
    set((state) => {
      const newMessages = { ...state.messages }
      Object.keys(newMessages).forEach((conversationId) => {
        const messages = newMessages[conversationId]
        if (messages) {
          newMessages[conversationId] = messages.filter(
            (msg) => msg.id !== messageId
          )
        }
      })
      return { messages: newMessages }
    })
  },

  setTypingUsers: (users) => {
    set({ typingUsers: users })
  },

  addTypingUser: (user) => {
    set((state) => ({
      typingUsers: [...state.typingUsers.filter(
        (u) => !(u.userId === user.userId && u.conversationId === user.conversationId)
      ), user],
    }))
  },

  removeTypingUser: (userId, conversationId) => {
    set((state) => ({
      typingUsers: state.typingUsers.filter(
        (u) => !(u.userId === userId && u.conversationId === conversationId)
      ),
    }))
  },

  setOnlineUsers: (users) => {
    set({ onlineUsers: new Set(users) })
  },

  addOnlineUser: (userId) => {
    set((state) => ({
      onlineUsers: new Set([...state.onlineUsers, userId]),
    }))
  },

  removeOnlineUser: (userId) => {
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers)
      newOnlineUsers.delete(userId)
      return { onlineUsers: newOnlineUsers }
    })
  },

  setConnected: (connected) => {
    set({ isConnected: connected })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },
}))