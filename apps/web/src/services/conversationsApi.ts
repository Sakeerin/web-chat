import { apiService, endpoints } from './api'

export interface ConversationMember {
  id: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  isActive: boolean
  isMuted: boolean
  mutedUntil?: string
  lastReadAt?: string
  user: {
    id: string
    username: string
    name: string
    avatarUrl?: string
    isOnline: boolean
    lastSeenAt: string
  }
}

export interface LastMessage {
  id: string
  content: string
  type: string
  senderId: string
  createdAt: string
  sender: {
    username: string
    name: string
  }
}

export interface Conversation {
  id: string
  type: 'dm' | 'group' | 'channel'
  title?: string
  description?: string
  avatarUrl?: string
  ownerId?: string
  isArchived: boolean
  settings: Record<string, any>
  createdAt: string
  updatedAt: string
  members: ConversationMember[]
  lastMessage?: LastMessage
  unreadCount?: number
}

export interface ConversationListResponse {
  conversations: Conversation[]
  nextCursor?: string
  hasMore: boolean
  total: number
}

export interface CreateConversationRequest {
  type: 'dm' | 'group'
  participantIds: string[]
  title?: string
  description?: string
}

export interface ConversationSearchParams {
  query: string
  limit?: number
  cursor?: string
}

export interface ConversationSearchResult {
  conversations: Conversation[]
  total: number
  hasMore: boolean
}

export const conversationsApi = {
  // Get conversation list with pagination
  async getConversations(cursor?: string, limit = 20): Promise<ConversationListResponse> {
    const params: Record<string, string> = { limit: limit.toString() }
    if (cursor) {
      params.cursor = cursor
    }
    
    return apiService.get<ConversationListResponse>(endpoints.conversations.list, params)
  },

  // Create a new conversation
  async createConversation(data: CreateConversationRequest): Promise<Conversation> {
    return apiService.post<Conversation>(endpoints.conversations.create, data)
  },

  // Get a specific conversation
  async getConversation(id: string): Promise<Conversation> {
    return apiService.get<Conversation>(endpoints.conversations.get(id))
  },

  // Update conversation (title, avatar, etc.)
  async updateConversation(id: string, updates: Partial<Pick<Conversation, 'title' | 'description' | 'avatarUrl'>>): Promise<Conversation> {
    return apiService.patch<Conversation>(endpoints.conversations.update(id), updates)
  },

  // Delete/leave conversation
  async deleteConversation(id: string): Promise<void> {
    return apiService.delete<void>(endpoints.conversations.delete(id))
  },

  // Search conversations
  async searchConversations(params: ConversationSearchParams): Promise<ConversationSearchResult> {
    const searchParams: Record<string, string> = {
      query: params.query,
    }
    
    if (params.limit) {
      searchParams.limit = params.limit.toString()
    }
    
    if (params.cursor) {
      searchParams.cursor = params.cursor
    }

    return apiService.get<ConversationSearchResult>(endpoints.search.conversations, searchParams)
  },

  // Add member to group conversation
  async addMember(conversationId: string, userId: string): Promise<ConversationMember> {
    return apiService.post<ConversationMember>(endpoints.conversations.addMember(conversationId), {
      userId,
    })
  },

  // Remove member from group conversation
  async removeMember(conversationId: string, userId: string): Promise<void> {
    return apiService.delete<void>(endpoints.conversations.removeMember(conversationId, userId))
  },
}