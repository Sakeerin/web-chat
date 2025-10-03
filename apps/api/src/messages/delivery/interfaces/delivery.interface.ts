import { MessageWithRelations } from '../../interfaces/message.interface'

export interface MessageDeliveryState {
  messageId: string
  state: 'sent' | 'delivered' | 'read'
  deliveredTo: string[]
  readBy: string[]
  timestamp: Date
}

export interface MessageWithDeliveryState extends MessageWithRelations {
  deliveryState: MessageDeliveryState
  showReadReceipts: boolean
}

export interface OfflineMessage {
  messageId: string
  conversationId: string
  userId: string
  message: MessageWithRelations
  queuedAt: Date
}

export interface DeliveryReceipt {
  messageId: string
  userId: string
  type: 'delivered' | 'read'
  timestamp: Date
}

export interface MessageDeduplicationResult {
  isDuplicate: boolean
  existingMessageId?: string
}

export interface BackfillRequest {
  conversationId: string
  lastMessageId?: string
  limit?: number
}

export interface BackfillResponse {
  messages: MessageWithDeliveryState[]
  hasMore: boolean
  nextCursor?: string
}

export interface DeliveryStats {
  totalSent: number
  totalDelivered: number
  totalRead: number
  deliveryRate: number
  readRate: number
}

export interface PrivacySettings {
  sendReadReceipts: boolean
  showReadReceipts: boolean
  showLastSeen: boolean
  showOnlineStatus: boolean
}