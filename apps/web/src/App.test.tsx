import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
  }),
}))

// Mock the token refresh hook
vi.mock('@/hooks/useTokenRefresh', () => ({
  useTokenRefresh: () => ({}),
}))

describe('App', () => {
  it('renders without crashing', async () => {
    render(<App />)
    
    // Wait for the initialization delay to complete
    await waitFor(() => {
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    }, { timeout: 1000 })
  })
})