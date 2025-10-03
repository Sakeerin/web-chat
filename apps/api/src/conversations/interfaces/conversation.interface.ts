import { ConversationType, ConversationMemberRole } from '@prisma/client'

export interface ConversationWithMembers {
  id: string
  type: ConversationType
  title?: string
  description?: string
  avatarUrl?: string
  ownerId?: string
  isArchived: boolean
  settings: Record<string, any>
  createdAt: Date
  updatedAt: Date
  members: ConversationMemberInfo[]
  lastMessage?: LastMessageInfo
  unreadCount?: number
}

export interface ConversationMemberInfo {
  id: string
  userId: string
  role: ConversationMemberRole
  joinedAt: Date
  isActive: boolean
  isMuted: boolean
  mutedUntil?: Date
  lastReadAt?: Date
  user: {
    id: string
    username: string
    name: string
    avatarUrl?: string
    isOnline: boolean
    lastSeenAt: Date
  }
}

export interface LastMessageInfo {
  id: string
  content: string
  type: string
  senderId: string
  createdAt: Date
  sender: {
    username: string
    name: string
  }
}

export interface ConversationListResponse {
  conversations: ConversationWithMembers[]
  nextCursor?: string
  hasMore: boolean
  total: number
}

export interface ConversationSearchResult {
  conversations: ConversationWithMembers[]
  total: number
  hasMore: boolean
}