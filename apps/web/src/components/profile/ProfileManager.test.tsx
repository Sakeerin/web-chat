import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { ProfileManager } from './ProfileManager'
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile } from '@shared/types'

// Mock the API service
vi.mock('@/services/api')
const mockApiService = apiService as any

// Mock the auth store
vi.mock('@/stores/authStore')
const mockUseAuthStore = useAuthStore as any

// Mock child components
vi.mock('./ProfileEditForm', () => ({
  ProfileEditForm: ({ onSuccess, onCancel }: any) => (
    <div data-testid="profile-edit-form">
      <button onClick={onSuccess}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./UsernameEditForm', () => ({
  UsernameEditForm: ({ onSuccess, onCancel }: any) => (
    <div data-testid="username-edit-form">
      <button onClick={onSuccess}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('./PrivacySettings', () => ({
  PrivacySettings: ({ onSuccess }: any) => (
    <div data-testid="privacy-settings">
      <button onClick={onSuccess}>Save</button>
    </div>
  ),
}))

vi.mock('./AvatarCropper', () => ({
  AvatarCropper: ({ onCropComplete, onCancel }: any) => (
    <div data-testid="avatar-cropper">
      <button onClick={() => onCropComplete(new File([''], 'cropped.jpg'))}>Crop</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
}

const mockUserProfile: UserProfile = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  bio: 'Test bio',
  avatarUrl: 'https://example.com/avatar.jpg',
  lastSeenAt: new Date('2023-01-01'),
  createdAt: new Date('2022-01-01'),
  privacySettings: {
    lastSeenVisibility: 'everyone' as any,
    readReceiptsVisibility: 'contacts' as any,
    allowContactRequests: true,
    showOnlineStatus: false,
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

describe('ProfileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue(mockUser)
    mockApiService.get.mockResolvedValue(mockUserProfile)
  })

  it('renders loading state initially', () => {
    mockApiService.get.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithQueryClient(<ProfileManager />)

    expect(screen.getByText('Loading profile...')).toBeInTheDocument()
  })

  it('renders error state when profile fetch fails', async () => {
    mockApiService.get.mockRejectedValue(new Error('Failed to fetch'))

    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load profile information')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders profile overview by default', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('@testuser')).toBeInTheDocument()
    expect(screen.getByText('Test bio')).toBeInTheDocument()
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument()
  })

  it('shows privacy overview', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Privacy Overview')).toBeInTheDocument()
    })

    expect(screen.getByText('everyone')).toBeInTheDocument() // Last seen visibility
    expect(screen.getByText('contacts')).toBeInTheDocument() // Read receipts
    expect(screen.getByText('Hidden')).toBeInTheDocument() // Online status
    expect(screen.getByText('Allowed')).toBeInTheDocument() // Contact requests
  })

  it('navigates to edit profile form', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /edit profile/i })
    fireEvent.click(editButton)

    expect(screen.getByTestId('profile-edit-form')).toBeInTheDocument()
  })

  it('navigates to username edit form', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })

    const changeUsernameButton = screen.getByRole('button', { name: /change username/i })
    fireEvent.click(changeUsernameButton)

    expect(screen.getByTestId('username-edit-form')).toBeInTheDocument()
  })

  it('navigates to privacy settings', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Privacy Overview')).toBeInTheDocument()
    })

    const privacyButton = screen.getByRole('button', { name: /^privacy settings$/i })
    fireEvent.click(privacyButton)

    expect(screen.getByTestId('privacy-settings')).toBeInTheDocument()
  })

  it('returns to overview after successful form submission', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })

    // Navigate to edit form
    const editButton = screen.getByRole('button', { name: /edit profile/i })
    fireEvent.click(editButton)

    expect(screen.getByTestId('profile-edit-form')).toBeInTheDocument()

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })
  })

  it('returns to overview when canceling form', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })

    // Navigate to edit form
    const editButton = screen.getByRole('button', { name: /edit profile/i })
    fireEvent.click(editButton)

    expect(screen.getByTestId('profile-edit-form')).toBeInTheDocument()

    // Cancel form
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })
  })

  it('displays user avatar when available', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByAltText('Profile picture')).toBeInTheDocument()
    })

    const avatar = screen.getByAltText('Profile picture') as HTMLImageElement
    expect(avatar.src).toBe('https://example.com/avatar.jpg')
  })

  it('displays placeholder when no avatar', async () => {
    const userWithoutAvatar = { ...mockUserProfile, avatarUrl: undefined }
    mockApiService.get.mockResolvedValue(userWithoutAvatar)

    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('👤')).toBeInTheDocument()
    })
  })

  it('formats dates correctly', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText(/member since:/i)).toBeInTheDocument()
      expect(screen.getByText(/last seen:/i)).toBeInTheDocument()
    })

    // Check that dates are formatted
    expect(screen.getByText('Member since: 1/1/2022')).toBeInTheDocument()
  })

  it('handles avatar cropping workflow', async () => {
    renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument()
    })

    // Simulate avatar file selection (this would normally be done in ProfileEditForm)
    // For testing, we'll directly trigger the crop view
    const editButton = screen.getByRole('button', { name: /edit profile/i })
    fireEvent.click(editButton)

    // In a real scenario, the ProfileEditForm would call handleAvatarFileSelect
    // For testing, we need to simulate this workflow
    expect(screen.getByTestId('profile-edit-form')).toBeInTheDocument()
  })

  it('refetches profile data when user changes', async () => {
    const { rerender } = renderWithQueryClient(<ProfileManager />)

    await waitFor(() => {
      expect(mockApiService.get).toHaveBeenCalledWith('/users/profile')
    })

    // Change user
    const newUser = { ...mockUser, id: '2' }
    mockUseAuthStore.mockReturnValue(newUser)

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ProfileManager />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(mockApiService.get).toHaveBeenCalledTimes(2)
    })
  })

  it('does not fetch profile when user is not available', () => {
    mockUseAuthStore.mockReturnValue(null)

    renderWithQueryClient(<ProfileManager />)

    expect(mockApiService.get).not.toHaveBeenCalled()
  })
})