import { Message, MessageType, MessageEdit } from '@prisma/client'

export interface MessageWithRelations extends Message {
  sender: {
    id: string
    username: string
    name: string
    avatarUrl?: string
  }
  replyTo?: {
    id: string
    content: string
    sender: {
      id: string
      username: string
      name: string
    }
  }
  attachments: Array<{
    id: string
    objectKey: string
    fileName: string
    mimeType: string
    sizeBytes: number
    width?: number
    height?: number
    durationMs?: number
    thumbnailKey?: string
  }>
  edits: MessageEdit[]
  _count: {
    receipts: number
  }
}

export interface MessageListResponse {
  messages: MessageWithRelations[]
  nextCursor?: string
  hasMore: boolean
  total: number
}

export interface MessageSearchResult {
  messages: MessageWithRelations[]
  total: number
  hasMore: boolean
}

export interface CreateMessageInput {
  conversationId: string
  senderId: string
  type: MessageType
  content: string
  replyToId?: string
  metadata?: Record<string, any>
}

export interface UpdateMessageInput {
  content: string
}

export interface MessageEditHistory {
  id: string
  previousContent: string
  editedAt: Date
}