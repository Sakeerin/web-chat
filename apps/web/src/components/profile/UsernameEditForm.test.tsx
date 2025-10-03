import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { UsernameEditForm } from './UsernameEditForm'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile, UsernameAvailability } from '@shared/types'

// Mock the API service
vi.mock('@/services/api')
const mockApiService = apiService as any

// Mock the auth store
vi.mock('@/stores/authStore')
const mockUseAuthStore = useAuthStore as any

const mockUser: UserProfile = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  bio: 'Test bio',
  avatarUrl: 'https://example.com/avatar.jpg',
  lastSeenAt: new Date(),
  createdAt: new Date(),
  privacySettings: {
    lastSeenVisibility: 'everyone' as any,
    readReceiptsVisibility: 'everyone' as any,
    allowContactRequests: true,
    showOnlineStatus: true,
  },
}

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('UsernameEditForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()
  const mockUpdateUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue(mockUpdateUser)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders form with current username', () => {
    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    expect(screen.getByText('Change Username')).toBeInTheDocument()
  })

  it('filters invalid characters from username input', () => {
    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'test@user!' } })
    
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument() // Invalid chars filtered
  })

  it('converts username to lowercase', () => {
    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'TestUser123' } })
    
    expect(screen.getByDisplayValue('testuser123')).toBeInTheDocument()
  })

  it('checks username availability with debouncing', async () => {
    const availabilityResponse: UsernameAvailability = {
      available: true,
    }
    mockApiService.post.mockResolvedValue(availabilityResponse)

    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'newusername' } })

    // Fast-forward timers to trigger debounced check
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(mockApiService.post).toHaveBeenCalledWith('/users/check-username', {
        username: 'newusername',
      })
    }, { timeout: 1000 })

    await waitFor(() => {
      expect(screen.getByText('✓ Username is available')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('shows unavailable message with suggestions', async () => {
    const availabilityResponse: UsernameAvailability = {
      available: false,
      suggestions: ['newusername1', 'newusername2'],
    }
    mockApiService.post.mockResolvedValue(availabilityResponse)

    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'taken' } })

    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('✗ Username is not available')).toBeInTheDocument()
      expect(screen.getByText('Suggestions: newusername1, newusername2')).toBeInTheDocument()
    })
  })

  it('validates username length', async () => {
    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    
    // Test too short
    fireEvent.change(usernameInput, { target: { value: 'ab' } })
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters long')).toBeInTheDocument()
    })

    // Test too long
    fireEvent.change(usernameInput, { target: { value: 'a'.repeat(31) } })
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Username must be no more than 30 characters long')).toBeInTheDocument()
    })
  })

  it('validates username format', async () => {
    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'test-user' } })
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Username can only contain letters, numbers, and underscores')).toBeInTheDocument()
    })
  })

  it('submits form with valid username', async () => {
    const availabilityResponse: UsernameAvailability = { available: true }
    mockApiService.post.mockResolvedValue(availabilityResponse)
    mockApiService.put.mockResolvedValue({
      ...mockUser,
      username: 'newusername',
    })

    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'newusername' } })
    
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('✓ Username is available')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: /update username/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockApiService.put).toHaveBeenCalledWith('/users/profile', {
        username: 'newusername',
      })
    })

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('prevents submission with unavailable username', async () => {
    const availabilityResponse: UsernameAvailability = { available: false }
    mockApiService.post.mockResolvedValue(availabilityResponse)

    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'taken' } })
    
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('✗ Username is not available')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: /update username/i })
    expect(submitButton).toBeDisabled()
  })

  it('prevents submission with same username', () => {
    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByRole('button', { name: /update username/i })
    expect(submitButton).toBeDisabled()
  })

  it('handles form submission errors', async () => {
    const availabilityResponse: UsernameAvailability = { available: true }
    mockApiService.post.mockResolvedValue(availabilityResponse)
    mockApiService.put.mockRejectedValue(new Error('Update failed'))

    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'newusername' } })
    
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('✓ Username is available')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: /update username/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    const availabilityResponse: UsernameAvailability = { available: true }
    mockApiService.post.mockResolvedValue(availabilityResponse)
    mockApiService.put.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'newusername' } })
    
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('✓ Username is available')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: /update username/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })

    expect(usernameInput).toBeDisabled()
  })

  it('shows checking availability message', async () => {
    mockApiService.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    renderWithQueryClient(
      <UsernameEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const usernameInput = screen.getByDisplayValue('testuser')
    fireEvent.change(usernameInput, { target: { value: 'checking' } })
    
    vi.advanceTimersByTime(500)

    await waitFor(() => {
      expect(screen.getByText('Checking availability...')).toBeInTheDocument()
    })
  })
})