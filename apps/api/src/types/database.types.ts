import { 
  User, 
  Conversation, 
  Message, 
  Attachment, 
  ConversationMember,
  MessageReceipt,
  ContactRequest,
  UserSession,
  BlockedUser,
  UserReport,
  MessageEdit,
  AuditLog,
  ConversationType,
  ConversationMemberRole,
  MessageType,
  ReceiptType,
  ContactRequestStatus,
  ReportStatus
} from '@prisma/client'

// Re-export Prisma types for use throughout the application
export {
  User,
  Conversation,
  Message,
  Attachment,
  ConversationMember,
  MessageReceipt,
  ContactRequest,
  UserSession,
  BlockedUser,
  UserReport,
  MessageEdit,
  AuditLog,
  ConversationType,
  ConversationMemberRole,
  MessageType,
  ReceiptType,
  ContactRequestStatus,
  ReportStatus,
}

// Extended types with relations
export type UserWithSessions = User & {
  sessions: UserSession[]
}

export type ConversationWithMembers = Conversation & {
  members: (ConversationMember & {
    user: User
  })[]
  owner?: User
}

export type ConversationWithLastMessage = Conversation & {
  members: ConversationMember[]
  messages: Message[]
}

export type MessageWithAttachments = Message & {
  attachments: Attachment[]
  sender: User
  replyTo?: Message
  receipts?: MessageReceipt[]
}

export type MessageWithSender = Message & {
  sender: {
    id: string
    username: string
    name: string
    avatarUrl?: string
  }
  attachments: Attachment[]
  replyTo?: {
    id: string
    content: string
    sender: {
      username: string
      name: string
    }
  }
}

export type ConversationMemberWithUser = ConversationMember & {
  user: {
    id: string
    username: string
    name: string
    avatarUrl?: string
    isOnline: boolean
    lastSeenAt: Date
  }
}

// Privacy settings type
export interface PrivacySettings {
  showLastSeen: boolean
  showReadReceipts: boolean
  allowContactRequests: boolean
  showOnlineStatus: boolean
}

// Message metadata types
export interface TextMessageMetadata {
  mentions?: string[] // User IDs mentioned in the message
  links?: string[] // URLs found in the message
  formatting?: {
    bold?: Array<{ start: number; end: number }>
    italic?: Array<{ start: number; end: number }>
    code?: Array<{ start: number; end: number }>
  }
}

export interface MediaMessageMetadata {
  originalName?: string
  caption?: string
  compressed?: boolean
  quality?: number
}

export interface SystemMessageMetadata {
  action: 'user_joined' | 'user_left' | 'title_changed' | 'avatar_changed'
  actorId?: string
  targetId?: string
  oldValue?: string
  newValue?: string
}

// Database query options
export interface PaginationOptions {
  cursor?: string
  limit?: number
  skip?: number
}

export interface MessageQueryOptions extends PaginationOptions {
  conversationId: string
  before?: string
  after?: string
  includeDeleted?: boolean
}

export interface ConversationQueryOptions extends PaginationOptions {
  userId: string
  type?: ConversationType
  includeArchived?: boolean
}

// Search types
export interface SearchOptions {
  query: string
  limit?: number
  offset?: number
  filters?: {
    conversationId?: string
    senderId?: string
    messageType?: MessageType
    dateFrom?: Date
    dateTo?: Date
  }
}

export interface SearchResult {
  messages: MessageWithSender[]
  total: number
  hasMore: boolean
}

// Statistics types
export interface DatabaseStats {
  users: number
  conversations: number
  messages: number
  attachments: number
  timestamp: string
}

export interface UserStats {
  messagesSent: number
  conversationsJoined: number
  contactsCount: number
  lastActive: Date
}

// Audit log types
export interface AuditLogData {
  adminId: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
}