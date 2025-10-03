import { apiService, endpoints } from './api'
import type {
  ContactRequest,
  BlockedUser,
  UserReport,
  ContactListResponse,
  BlockedUsersListResponse,
  SearchUser,
} from '@/types/contacts'

export interface SendContactRequestData {
  username: string
  message?: string
}

export interface RespondToContactRequestData {
  status: 'ACCEPTED' | 'DECLINED'
}

export interface BlockUserData {
  userId: string
  reason?: string
}

export interface BlockUserByUsernameData {
  username: string
  reason?: string
}

export interface ReportUserData {
  userId: string
  reason: string
  description?: string
}

export interface ReportUserByUsernameData {
  username: string
  reason: string
  description?: string
}

export interface SearchUsersParams {
  query: string
  limit?: number
  offset?: number
}

export interface ContactsListParams {
  limit?: number
  offset?: number
}

export const contactsApi = {
  // Contact requests
  async sendContactRequest(data: SendContactRequestData): Promise<ContactRequest> {
    return apiService.post<ContactRequest>(endpoints.contacts.send, data)
  },

  async respondToContactRequest(
    requestId: string,
    data: RespondToContactRequestData
  ): Promise<ContactRequest> {
    return apiService.patch<ContactRequest>(
      endpoints.contacts.accept(requestId),
      data
    )
  },

  async getPendingContactRequests(): Promise<ContactRequest[]> {
    return apiService.get<ContactRequest[]>(`${endpoints.contacts.requests}?type=received`)
  },

  async getSentContactRequests(): Promise<ContactRequest[]> {
    return apiService.get<ContactRequest[]>(`${endpoints.contacts.requests}?type=sent`)
  },

  // Contacts management
  async getContacts(params?: ContactsListParams): Promise<ContactListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    
    const query = searchParams.toString()
    const url = query ? `${endpoints.contacts.list}?${query}` : endpoints.contacts.list
    
    return apiService.get<ContactListResponse>(url)
  },

  async removeContact(contactId: string): Promise<void> {
    return apiService.delete<void>(`${endpoints.contacts.list}/${contactId}`)
  },

  // User search
  async searchUsers(params: SearchUsersParams): Promise<SearchUser[]> {
    const searchParams = new URLSearchParams()
    searchParams.append('query', params.query)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    
    return apiService.get<SearchUser[]>(`${endpoints.users.search}?${searchParams.toString()}`)
  },

  // Blocking
  async blockUser(data: BlockUserData): Promise<BlockedUser> {
    return apiService.post<BlockedUser>(endpoints.contacts.block(data.userId), {
      reason: data.reason,
    })
  },

  async blockUserByUsername(data: BlockUserByUsernameData): Promise<BlockedUser> {
    return apiService.post<BlockedUser>('/contacts/block-by-username', data)
  },

  async unblockUser(userId: string): Promise<void> {
    return apiService.delete<void>(endpoints.contacts.unblock(userId))
  },

  async getBlockedUsers(params?: ContactsListParams): Promise<BlockedUsersListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    
    const query = searchParams.toString()
    const url = query ? `/contacts/blocked?${query}` : '/contacts/blocked'
    
    return apiService.get<BlockedUsersListResponse>(url)
  },

  // Reporting
  async reportUser(data: ReportUserData): Promise<UserReport> {
    return apiService.post<UserReport>('/contacts/report', data)
  },

  async reportUserByUsername(data: ReportUserByUsernameData): Promise<UserReport> {
    return apiService.post<UserReport>('/contacts/report-by-username', data)
  },
}