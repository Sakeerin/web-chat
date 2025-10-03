import { useAuthStore } from '@/stores/authStore'
import { securityManager } from '@/utils/security'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  requestId: string
}

class ApiService {
  private baseURL: string
  private csrfToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async getCSRFToken(): Promise<string | null> {
    if (this.csrfToken) {
      return this.csrfToken
    }

    try {
      const response = await fetch(`${this.baseURL}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        this.csrfToken = data.token
        return this.csrfToken
      }
    } catch (error) {
      console.error('Failed to get CSRF token:', error)
    }

    return null
  }

  private sanitizeRequestData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data
    }

    const sanitized: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Sanitize string values
        sanitized[key] = securityManager.sanitizeInput(value)
      } else if (Array.isArray(value)) {
        // Sanitize array values
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? securityManager.sanitizeInput(item) : item
        )
      } else if (value && typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeRequestData(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    // Check rate limit
    const rateLimitCheck = securityManager.checkRateLimit(endpoint)
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter} seconds.`)
    }
    
    // Get auth token
    const token = useAuthStore.getState().accessToken
    
    // Get CSRF token for state-changing requests
    const method = options.method?.toUpperCase()
    let csrfToken: string | null = null
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      csrfToken = await this.getCSRFToken()
    }
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        ...options.headers,
      },
      credentials: 'include', // Enable cookies for CSRF protection
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      // Handle different response types
      const contentType = response.headers.get('content-type')
      let data: any
      
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      if (!response.ok) {
        // Handle API errors
        const error: ApiError = data.error || {
          code: 'UNKNOWN_ERROR',
          message: data.message || 'An unknown error occurred',
          timestamp: new Date().toISOString(),
          requestId: response.headers.get('x-request-id') || 'unknown',
        }

        // Handle authentication errors
        if (response.status === 401) {
          // Token expired or invalid, clear auth state
          useAuthStore.getState().clearAuth()
          // Redirect to login would be handled by the ProtectedRoute component
        }

        throw new Error(error.message)
      }

      return data
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error occurred')
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(endpoint, this.baseURL)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }
    
    return this.request<T>(url.pathname + url.search)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const sanitizedData = this.sanitizeRequestData(data)
    return this.request<T>(endpoint, {
      method: 'POST',
      body: sanitizedData ? JSON.stringify(sanitizedData) : null,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const sanitizedData = this.sanitizeRequestData(data)
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: sanitizedData ? JSON.stringify(sanitizedData) : null,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const sanitizedData = this.sanitizeRequestData(data)
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: sanitizedData ? JSON.stringify(sanitizedData) : null,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  // File upload with FormData
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = useAuthStore.getState().accessToken
    
    // Validate files in FormData
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const validation = securityManager.validateFile(value)
        if (!validation.valid) {
          throw new Error(validation.error)
        }
      }
    }
    
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    })
  }

  // Secure file upload method
  async uploadFile(file: File, endpoint: string): Promise<any> {
    // Validate file before upload
    const validation = securityManager.validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const formData = new FormData()
    formData.append('file', file)

    return this.upload(endpoint, formData)
  }
}

export const apiService = new ApiService(API_BASE_URL)

// API endpoints organized by feature
export const endpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    profile: '/auth/profile',
    enable2fa: '/auth/2fa/enable',
    verify2fa: '/auth/2fa/verify',
    disable2fa: '/auth/2fa/disable',
  },
  
  // Users
  users: {
    profile: '/users/me',
    updateProfile: '/users/me',
    checkUsername: '/users/check-username',
    search: '/users/search',
    uploadAvatar: '/users/avatar',
  },
  
  // Contacts
  contacts: {
    list: '/contacts',
    requests: '/contacts/requests',
    send: '/contacts/requests',
    accept: (id: string) => `/contacts/requests/${id}/accept`,
    deny: (id: string) => `/contacts/requests/${id}/deny`,
    block: (id: string) => `/contacts/${id}/block`,
    unblock: (id: string) => `/contacts/${id}/unblock`,
  },
  
  // Conversations
  conversations: {
    list: '/conversations',
    create: '/conversations',
    get: (id: string) => `/conversations/${id}`,
    update: (id: string) => `/conversations/${id}`,
    delete: (id: string) => `/conversations/${id}`,
    members: (id: string) => `/conversations/${id}/members`,
    addMember: (id: string) => `/conversations/${id}/members`,
    removeMember: (id: string, userId: string) => `/conversations/${id}/members/${userId}`,
  },
  
  // Messages
  messages: {
    list: (conversationId: string) => `/conversations/${conversationId}/messages`,
    send: (conversationId: string) => `/conversations/${conversationId}/messages`,
    get: (id: string) => `/messages/${id}`,
    edit: (id: string) => `/messages/${id}`,
    delete: (id: string) => `/messages/${id}`,
    search: '/messages/search',
  },
  
  // Upload
  upload: {
    presignedUrl: '/upload/presigned-url',
    process: '/upload/process',
    delete: '/upload',
  },
  
  // Search
  search: {
    messages: '/search/messages',
    users: '/search/users',
    conversations: '/search/conversations',
  },
} as const