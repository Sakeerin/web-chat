import { apiService as api } from './api'

export interface AdminUser {
  id: string
  username: string
  email: string
  name: string
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  isActive: boolean
  isSuspended: boolean
  suspendedUntil?: string
  createdAt: string
  lastSeenAt: string
}

export interface UserReport {
  id: string
  reporterId: string
  reportedUserId: string
  reason: string
  description?: string
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'
  reviewedBy?: string
  reviewedAt?: string
  resolution?: string
  createdAt: string
  updatedAt: string
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

export interface AuditLog {
  id: string
  adminId: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  createdAt: string
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

export interface UserGrowthAnalytics {
  dailySignups: Array<{ date: string; count: number }>
  totalGrowth: number
  averageDaily: number
}

export interface MessageAnalytics {
  dailyMessages: Array<{ date: string; count: number }>
  totalMessages: number
  averageDaily: number
  messagesByType: Record<string, number>
}

export interface ReportAnalytics {
  dailyReports: Array<{ date: string; count: number }>
  reportsByStatus: Record<string, number>
  reportsByReason: Record<string, number>
  averageResolutionTime: number
}

export const adminApi = {
  // User Management
  async getUsers(params: {
    page?: number
    limit?: number
    search?: string
    role?: string
    status?: string
  }): Promise<{ users: AdminUser[]; total: number; pages: number }> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.search) searchParams.append('search', params.search)
    if (params.role) searchParams.append('role', params.role)
    if (params.status) searchParams.append('status', params.status)

    const response = await api.get(`/admin/users?${searchParams.toString()}`)
    return response.data
  },

  async getUserById(userId: string): Promise<AdminUser> {
    const response = await api.get(`/admin/users/${userId}`)
    return response.data
  },

  async suspendUser(userId: string, data: { reason: string; duration?: number }) {
    const response = await api.post(`/admin/users/${userId}/suspend`, data)
    return response.data
  },

  async unsuspendUser(userId: string) {
    const response = await api.post(`/admin/users/${userId}/unsuspend`)
    return response.data
  },

  async banUser(userId: string, data: { reason: string; permanent: boolean }) {
    const response = await api.post(`/admin/users/${userId}/ban`, data)
    return response.data
  },

  async updateUserRole(userId: string, data: { role: string }) {
    const response = await api.put(`/admin/users/${userId}/role`, data)
    return response.data
  },

  // Report Management
  async getReports(params: {
    page?: number
    limit?: number
    status?: string
  }): Promise<{ reports: UserReport[]; total: number; pages: number }> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.status) searchParams.append('status', params.status)

    const response = await api.get(`/admin/reports?${searchParams.toString()}`)
    return response.data
  },

  async getReportById(reportId: string): Promise<UserReport> {
    const response = await api.get(`/admin/reports/${reportId}`)
    return response.data
  },

  async getReportedContent(reportId: string) {
    const response = await api.get(`/admin/reports/${reportId}/content`)
    return response.data
  },

  async reviewReport(reportId: string, data: { status: string; resolution?: string }) {
    const response = await api.put(`/admin/reports/${reportId}/review`, data)
    return response.data
  },

  // Content Moderation
  async deleteMessage(messageId: string, data: { reason: string }) {
    const response = await api.delete(`/admin/messages/${messageId}`, { data })
    return response.data
  },

  async deleteConversation(conversationId: string, data: { reason: string }) {
    const response = await api.delete(`/admin/conversations/${conversationId}`, { data })
    return response.data
  },

  // Analytics
  async getSystemAnalytics(): Promise<SystemAnalytics> {
    const response = await api.get('/admin/analytics')
    return response.data
  },

  async getUserGrowthAnalytics(days: number = 30): Promise<UserGrowthAnalytics> {
    const response = await api.get(`/admin/analytics/users?days=${days}`)
    return response.data
  },

  async getMessageAnalytics(days: number = 30): Promise<MessageAnalytics> {
    const response = await api.get(`/admin/analytics/messages?days=${days}`)
    return response.data
  },

  async getReportAnalytics(days: number = 30): Promise<ReportAnalytics> {
    const response = await api.get(`/admin/analytics/reports?days=${days}`)
    return response.data
  },

  // Audit Logs
  async getAuditLogs(params: {
    page?: number
    limit?: number
    adminId?: string
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
  }): Promise<{ logs: AuditLog[]; total: number; pages: number }> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.adminId) searchParams.append('adminId', params.adminId)
    if (params.action) searchParams.append('action', params.action)
    if (params.resource) searchParams.append('resource', params.resource)
    if (params.startDate) searchParams.append('startDate', params.startDate)
    if (params.endDate) searchParams.append('endDate', params.endDate)

    const response = await api.get(`/admin/audit-logs?${searchParams.toString()}`)
    return response.data
  },

  async getAuditLogById(logId: string): Promise<AuditLog> {
    const response = await api.get(`/admin/audit-logs/${logId}`)
    return response.data
  },

  async getAdminActivity(adminId: string, days: number = 30) {
    const response = await api.get(`/admin/audit-logs/admin/${adminId}/activity?days=${days}`)
    return response.data
  },

  async getSystemAuditSummary(days: number = 7) {
    const response = await api.get(`/admin/audit-logs/system/summary?days=${days}`)
    return response.data
  },
}