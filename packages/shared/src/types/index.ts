// Common types used across frontend and backend

export interface User {
  id: string
  username: string
  email: string
  name: string
  bio?: string
  avatarUrl?: string
  lastSeenAt: Date
  createdAt: Date
}

export interface UserProfile extends User {
  privacySettings: PrivacySettings
}

export interface PublicUserProfile {
  id: string
  username: string
  name: string
  bio?: string
  avatarUrl?: string
  lastSeenAt?: Date
  isOnline?: boolean
}

export enum LastSeenVisibility {
  EVERYONE = 'everyone',
  CONTACTS = 'contacts',
  NOBODY = 'nobody',
}

export enum ReadReceiptsVisibility {
  EVERYONE = 'everyone',
  CONTACTS = 'contacts',
  NOBODY = 'nobody',
}

export interface PrivacySettings {
  lastSeenVisibility: LastSeenVisibility
  readReceiptsVisibility: ReadReceiptsVisibility
  allowContactRequests: boolean
  showOnlineStatus: boolean
}

export interface UsernameAvailability {
  available: boolean
  suggestions?: string[]
}

export interface UserSearchResult {
  users: PublicUserProfile[]
  total: number
  hasMore: boolean
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system'
  content: string
  metadata?: Record<string, any>
  replyToId?: string | null
  isEdited: boolean
  isDeleted: boolean
  createdAt: Date
  editedAt?: Date | null
  deletedAt?: Date | null
}

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
  edits: Array<{
    id: string
    previousContent: string
    editedAt: Date
  }>
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

export interface Conversation {
  id: string
  type: 'dm' | 'group' | 'channel'
  title?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface ConversationWithMembers extends Conversation {
  members?: Array<{
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
  }>
  lastMessage?: MessageWithRelations | null
  unreadCount?: number
}