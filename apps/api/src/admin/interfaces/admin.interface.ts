export interface AdminUser {
  id: string
  username: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  isSuspended: boolean
  suspendedUntil?: Date
  createdAt: Date
  lastSeenAt: Date
}

export interface UserReport {
  id: string
  reporterId: string
  reportedUserId: string
  reason: string
  description?: string
  status: ReportStatus
  reviewedBy?: string
  reviewedAt?: Date
  resolution?: string
  createdAt: Date
  updatedAt: Date
  reporter: {
    id: string
    username: string
    name: string
  }
  reported: {
    id: string
    username: string
    name: string
  }
}

export interface AuditLogEntry {
  id: string
  adminId: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  createdAt: Date
}

export interface SystemAnalytics {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  totalMessages: number
  totalConversations: number
  totalReports: number
  pendingReports: number
  dailyActiveUsers: number
  messagesSentToday: number
  reportsToday: number
}

export interface UserManagementResult {
  success: boolean
  message: string
  user?: AdminUser
}

export interface ReportReviewResult {
  success: boolean
  message: string
  report?: UserReport
}

export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum AdminAction {
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',
  USER_UNSUSPENDED = 'USER_UNSUSPENDED',
  USER_ROLE_UPDATED = 'USER_ROLE_UPDATED',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  CONVERSATION_DELETED = 'CONVERSATION_DELETED',
  REPORT_REVIEWED = 'REPORT_REVIEWED',
  REPORT_RESOLVED = 'REPORT_RESOLVED',
  REPORT_DISMISSED = 'REPORT_DISMISSED',
}