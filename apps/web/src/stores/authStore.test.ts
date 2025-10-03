import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('AuthStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    useAuthStore.getState().clearAuth()
  })

  it('should initialize with default state', () => {
    const state = useAuthStore.getState()
    
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should set auth state correctly', () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
    }
    const mockAccessToken = 'access-token'
    const mockRefreshToken = 'refresh-token'

    useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken)
    
    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe(mockAccessToken)
    expect(state.refreshToken).toBe(mockRefreshToken)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('should clear auth state correctly', () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
    }
    
    // Set auth first
    useAuthStore.getState().setAuth(mockUser, 'token', 'refresh')
    
    // Then clear it
    useAuthStore.getState().clearAuth()
    
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should update user correctly', () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
    }
    
    useAuthStore.getState().setAuth(mockUser, 'token', 'refresh')
    
    const updates = { name: 'Updated Name', avatarUrl: 'https://example.com/avatar.jpg' }
    useAuthStore.getState().updateUser(updates)
    
    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('Updated Name')
    expect(state.user?.avatarUrl).toBe('https://example.com/avatar.jpg')
    expect(state.user?.id).toBe('1') // Should preserve other fields
  })
})