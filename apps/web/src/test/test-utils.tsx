import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

/**
 * Test utilities for React component testing
 */

// Mock implementations
export const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
  id: 'mock-socket-id'
}

export const mockAuthStore = {
  user: null,
  token: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  refreshToken: vi.fn(),
  updateProfile: vi.fn()
}

export const mockChatStore = {
  conversations: [],
  activeConversation: null,
  messages: [],
  isTyping: false,
  onlineUsers: [],
  setActiveConversation: vi.fn(),
  sendMessage: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
  startTyping: vi.fn(),
  stopTyping: vi.fn(),
  markAsRead: vi.fn()
}

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient
  }
) => {
  const { queryClient, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: (props) => <TestWrapper {...props} queryClient={queryClient} />,
    ...renderOptions,
  })
}

// Mock API responses
export const mockApiResponses = {
  user: {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    privacySettings: {
      showLastSeen: true,
      showReadReceipts: true
    }
  },
  conversation: {
    id: '1',
    type: 'dm',
    title: null,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        userId: '1',
        role: 'member',
        joinedAt: new Date().toISOString()
      }
    ],
    lastMessage: {
      id: '1',
      content: 'Hello world',
      senderId: '1',
      createdAt: new Date().toISOString()
    }
  },
  message: {
    id: '1',
    conversationId: '1',
    senderId: '1',
    content: 'Test message',
    type: 'text',
    createdAt: new Date().toISOString(),
    editedAt: null,
    deletedAt: null,
    attachments: []
  }
}

// Mock fetch function
export const mockFetch = vi.fn()

// Setup fetch mock
export function setupFetchMock() {
  global.fetch = mockFetch
  
  // Default successful responses
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = options?.method || 'GET'
    
    // Auth endpoints
    if (url.includes('/auth/login')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          user: mockApiResponses.user,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        })
      })
    }
    
    if (url.includes('/auth/register')) {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          message: 'User registered successfully'
        })
      })
    }
    
    // User endpoints
    if (url.includes('/users/profile')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockApiResponses.user)
      })
    }
    
    // Conversation endpoints
    if (url.includes('/conversations') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockApiResponses.conversation])
      })
    }
    
    // Message endpoints
    if (url.includes('/messages') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockApiResponses.message])
      })
    }
    
    // Default response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({})
    })
  })
}

// Mock WebSocket
export function mockWebSocket() {
  global.WebSocket = vi.fn().mockImplementation(() => mockSocket)
}

// Mock IntersectionObserver
export function mockIntersectionObserver() {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// Mock ResizeObserver
export function mockResizeObserver() {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// Mock localStorage
export function mockLocalStorage() {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  })
  
  return localStorageMock
}

// Mock sessionStorage
export function mockSessionStorage() {
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
  })
  
  return sessionStorageMock
}

// Wait for element to appear
export async function waitForElement(
  getElement: () => HTMLElement | null,
  timeout = 5000
): Promise<HTMLElement> {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    const element = getElement()
    if (element) {
      return element
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  throw new Error(`Element not found within ${timeout}ms`)
}

// Create mock file
export function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  })
  return file
}

// Setup all common mocks
export function setupTestEnvironment() {
  setupFetchMock()
  mockWebSocket()
  mockIntersectionObserver()
  mockResizeObserver()
  mockLocalStorage()
  mockSessionStorage()
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }