import { apiService } from './api'
import type { MessageWithRelations, MessageListResponse } from '@shared/types'

export interface SendMessageRequest {
  conversationId: string
  content: string
  type?: 'text' | 'image' | 'video' | 'audio' | 'file'
  replyToId?: string
  metadata?: Record<string, any>
}

export interface EditMessageRequest {
  content: string
}

export interface MessageListParams {
  conversationId: string
  cursor?: string
  limit?: number
}

export const messagesApi = {
  // Get messages for a conversation
  getMessages: async (params: MessageListParams): Promise<MessageListResponse> => {
    const searchParams = new URLSearchParams()
    if (params.cursor) searchParams.append('cursor', params.cursor)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    
    return await apiService.get(`/conversations/${params.conversationId}/messages?${searchParams}`)
  },

  // Send a new message
  sendMessage: async (message: SendMessageRequest): Promise<MessageWithRelations> => {
    return await apiService.post(`/conversations/${message.conversationId}/messages`, message)
  },

  // Edit an existing message
  editMessage: async (messageId: string, updates: EditMessageRequest): Promise<MessageWithRelations> => {
    return await apiService.patch(`/messages/${messageId}`, updates)
  },

  // Delete a message
  deleteMessage: async (messageId: string): Promise<void> => {
    await apiService.delete(`/messages/${messageId}`)
  },

  // Mark messages as read
  markAsRead: async (conversationId: string, messageId: string): Promise<void> => {
    await apiService.post(`/conversations/${conversationId}/messages/${messageId}/read`)
  },

  // Get message edit history
  getMessageHistory: async (messageId: string): Promise<any[]> => {
    return await apiService.get(`/messages/${messageId}/history`)
  }
}