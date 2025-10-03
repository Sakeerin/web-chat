export interface AuthenticatedSocket extends Socket {
  userId: string
  user: {
    id: string
    username: string
    name: string
  }
}

export interface ClientEvents {
  'auth': (token: string) => void
  'join-room': (conversationId: string) => void
  'leave-room': (conversationId: string) => void
  'send-message': (message: MessageInput) => void
  'typing-start': (conversationId: string) => void
  'typing-stop': (conversationId: string) => void
  'presence-update': (status: PresenceStatus) => void
}

export interface ServerEvents {
  'message-new': (message: Message) => void
  'message-ack': (tempId: string, messageId: string) => void
  'message-edited': (message: Message) => void
  'message-deleted': (messageId: string) => void
  'typing': (userId: string, conversationId: string) => void
  'presence': (userId: string, status: PresenceStatus) => void
  'receipt': (messageId: string, userId: string, type: ReceiptType) => void
  'error': (error: { code: string; message: string }) => void
}

export interface MessageInput {
  tempId: string
  conversationId: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  replyToId?: string
  attachments?: AttachmentInput[]
}

export interface AttachmentInput {
  objectKey: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
  durationMs?: number
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system'
  content: string
  replyToId?: string
  attachments: Attachment[]
  createdAt: Date
  editedAt?: Date
  deletedAt?: Date
}

export interface Attachment {
  id: string
  messageId: string
  objectKey: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
  durationMs?: number
  thumbnailKey?: string
}

export type PresenceStatus = 'online' | 'away' | 'offline'
export type ReceiptType = 'delivered' | 'seen'

export interface PresenceData {
  userId: string
  status: PresenceStatus
  lastSeenAt: Date
  socketIds: string[]
}

export interface TypingData {
  userId: string
  conversationId: string
  isTyping: boolean
  lastTypingAt: Date
}

import { Socket } from 'socket.io'