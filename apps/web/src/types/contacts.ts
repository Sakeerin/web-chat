export interface Contact {
  id: string
  username: string
  name: string
  bio?: string
  avatarUrl?: string
  lastSeenAt?: Date
  isOnline?: boolean
  contactedAt: Date
}

export interface ContactRequest {
  id: string
  senderId: string
  receiverId: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  message?: string
  createdAt: Date
  updatedAt: Date
  sender: {
    id: string
    username: string
    name: string
    avatarUrl?: string
  }
  receiver: {
    id: string
    username: string
    name: string
    avatarUrl?: string
  }
}

export interface BlockedUser {
  id: string
  blockingUserId: string
  blockedUserId: string
  reason?: string
  createdAt: Date
  blockedUser: {
    id: string
    username: string
    name: string
    avatarUrl?: string
  }
}

export interface UserReport {
  id: string
  reporterId: string
  reportedUserId: string
  reason: string
  description?: string
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED'
  createdAt: Date
  updatedAt: Date
  reported: {
    id: string
    username: string
    name: string
    avatarUrl?: string
  }
}

export interface ContactListResponse {
  contacts: Contact[]
  total: number
  hasMore: boolean
}

export interface BlockedUsersListResponse {
  blockedUsers: BlockedUser[]
  total: number
  hasMore: boolean
}

export interface SearchUser {
  id: string
  username: string
  name: string
  bio?: string
  avatarUrl?: string
  isContact?: boolean
  isBlocked?: boolean
}