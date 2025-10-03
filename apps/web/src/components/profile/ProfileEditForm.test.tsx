import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { ProfileEditForm } from './ProfileEditForm'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile } from '@shared/types'

// Mock the API service
vi.mock('@/services/api')
const mockApiService = apiService as any

// Mock the auth store
vi.mock('@/stores/authStore')
const mockUseAuthStore = useAuthStore as any

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock FileReader
global.FileReader = class {
  onload: ((event: any) => void) | null = null
  readAsDataURL = vi.fn(() => {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: 'data:image/jpeg;base64,mock-data' } })
      }
    }, 0)
  })
} as any

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

describe('ProfileEditForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()
  const mockUpdateUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue(mockUpdateUser)
  })

  it('renders form with user data', () => {
    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument()
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
  })

  it('updates form fields when user types', () => {
    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } })
    
    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument()
  })

  it('handles avatar file selection', async () => {
    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByRole('button', { name: /change photo/i })
    
    // Click the change photo button to trigger file input
    fireEvent.click(fileInput)
    
    // Find the hidden file input and simulate file selection
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(hiddenInput)
    
    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument()
    })
  })

  it('validates file type for avatar upload', async () => {
    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const fileInput = screen.getByRole('button', { name: /change photo/i })
    
    fireEvent.click(fileInput)
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(hiddenInput)
    
    await waitFor(() => {
      expect(screen.getByText('Please select an image file')).toBeInTheDocument()
    })
  })

  it('validates file size for avatar upload', async () => {
    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByRole('button', { name: /change photo/i })
    
    fireEvent.click(fileInput)
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(hiddenInput, 'files', {
      value: [largeFile],
      writable: false,
    })
    
    fireEvent.change(hiddenInput)
    
    await waitFor(() => {
      expect(screen.getByText('Image must be smaller than 5MB')).toBeInTheDocument()
    })
  })

  it('submits form with updated data', async () => {
    mockApiService.put.mockResolvedValue({
      ...mockUser,
      name: 'Updated Name',
      bio: 'Updated bio',
    })

    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const nameInput = screen.getByDisplayValue('Test User')
    const bioInput = screen.getByDisplayValue('Test bio')
    
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } })
    fireEvent.change(bioInput, { target: { value: 'Updated bio' } })
    
    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockApiService.put).toHaveBeenCalledWith('/users/me', {
        name: 'Updated Name',
        bio: 'Updated bio',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
    })

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('handles form submission errors', async () => {
    mockApiService.put.mockRejectedValue(new Error('Update failed'))

    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows character count for bio field', () => {
    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('8/500')).toBeInTheDocument() // "Test bio" is 8 characters
  })

  it('disables form during submission', async () => {
    mockApiService.put.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    renderWithQueryClient(
      <ProfileEditForm
        user={mockUser}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    const nameInput = screen.getByDisplayValue('Test User')
    expect(nameInput).toBeDisabled()
  })
})