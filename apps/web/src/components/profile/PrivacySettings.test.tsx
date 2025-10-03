import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { PrivacySettings } from './PrivacySettings'
import { apiService } from '@/services/api'
import type { UserProfile, PrivacySettings as PrivacySettingsType } from '@shared/types'

// Mock the API service
vi.mock('@/services/api')
const mockApiService = apiService as any

const mockPrivacySettings: PrivacySettingsType = {
  lastSeenVisibility: 'everyone' as any,
  readReceiptsVisibility: 'contacts' as any,
  allowContactRequests: true,
  showOnlineStatus: false,
}

const mockUser: UserProfile = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  bio: 'Test bio',
  avatarUrl: 'https://example.com/avatar.jpg',
  lastSeenAt: new Date(),
  createdAt: new Date(),
  privacySettings: mockPrivacySettings,
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

describe('PrivacySettings', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders privacy settings form with current values', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    expect(screen.getByText('Privacy Settings')).toBeInTheDocument()
    
    // Check last seen visibility
    expect(screen.getByText('Who can see when you were last online?')).toBeInTheDocument()
    const everyoneRadio = screen.getByDisplayValue('everyone')
    expect(everyoneRadio).toBeChecked()
    
    // Check read receipts visibility
    expect(screen.getByText('Who can see your read receipts?')).toBeInTheDocument()
    const contactsRadio = screen.getByDisplayValue('contacts')
    expect(contactsRadio).toBeChecked()
    
    // Check online status
    const onlineStatusCheckbox = screen.getByRole('checkbox', { name: /show when i'm online/i })
    expect(onlineStatusCheckbox).not.toBeChecked()
    
    // Check contact requests
    const contactRequestsCheckbox = screen.getByRole('checkbox', { name: /allow contact requests/i })
    expect(contactRequestsCheckbox).toBeChecked()
  })

  it('updates last seen visibility setting', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    const nobodyRadios = screen.getAllByDisplayValue('nobody')
    const lastSeenNobodyRadio = nobodyRadios[0] // First one is for lastSeenVisibility
    fireEvent.click(lastSeenNobodyRadio)
    
    expect(lastSeenNobodyRadio).toBeChecked()
  })

  it('updates read receipts visibility setting', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    const everyoneRadio = screen.getAllByDisplayValue('everyone')[1] // Second one is for read receipts
    fireEvent.click(everyoneRadio)
    
    expect(everyoneRadio).toBeChecked()
  })

  it('toggles online status setting', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    const onlineStatusCheckbox = screen.getByRole('checkbox', { name: /show when i'm online/i })
    fireEvent.click(onlineStatusCheckbox)
    
    expect(onlineStatusCheckbox).toBeChecked()
  })

  it('toggles contact requests setting', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    const contactRequestsCheckbox = screen.getByRole('checkbox', { name: /allow contact requests/i })
    fireEvent.click(contactRequestsCheckbox)
    
    expect(contactRequestsCheckbox).not.toBeChecked()
  })

  it('enables save button when changes are made', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).toBeDisabled()

    // Make a change
    const nobodyRadios = screen.getAllByDisplayValue('nobody')
    fireEvent.click(nobodyRadios[0])
    
    expect(saveButton).toBeEnabled()
  })

  it('submits form with updated settings', async () => {
    mockApiService.put.mockResolvedValue(mockPrivacySettings)

    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    // Make changes
    const nobodyRadios = screen.getAllByDisplayValue('nobody')
    fireEvent.click(nobodyRadios[0])
    
    const onlineStatusCheckbox = screen.getByRole('checkbox', { name: /show when i'm online/i })
    fireEvent.click(onlineStatusCheckbox)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockApiService.put).toHaveBeenCalledWith('/users/me/privacy', {
        lastSeenVisibility: 'nobody',
        readReceiptsVisibility: 'contacts',
        allowContactRequests: true,
        showOnlineStatus: true,
      })
    })

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('handles form submission errors', async () => {
    mockApiService.put.mockRejectedValue(new Error('Update failed'))

    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    // Make a change
    const nobodyRadios = screen.getAllByDisplayValue('nobody')
    fireEvent.click(nobodyRadios[0])

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })
  })

  it('resets form to original values', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    // Make changes
    const nobodyRadios = screen.getAllByDisplayValue('nobody')
    fireEvent.click(nobodyRadios[0])
    
    const onlineStatusCheckbox = screen.getByRole('checkbox', { name: /show when i'm online/i })
    fireEvent.click(onlineStatusCheckbox)

    // Reset
    const resetButton = screen.getByRole('button', { name: /reset/i })
    fireEvent.click(resetButton)

    // Check original values are restored
    const everyoneRadios = screen.getAllByDisplayValue('everyone')
    expect(everyoneRadios[0]).toBeChecked() // First one is for lastSeenVisibility
    expect(onlineStatusCheckbox).not.toBeChecked()
  })

  it('shows loading state during submission', async () => {
    mockApiService.put.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    // Make a change
    const nobodyRadios = screen.getAllByDisplayValue('nobody')
    fireEvent.click(nobodyRadios[0])

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    // Check that form is disabled during submission
    expect(nobodyRadios[0]).toBeDisabled()
  })

  it('displays helpful descriptions for each setting', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    expect(screen.getByText('Anyone can see when you were last online')).toBeInTheDocument()
    expect(screen.getByText('Only your contacts can see when you\'ve read their messages')).toBeInTheDocument()
    expect(screen.getByText('Let others see when you\'re currently active')).toBeInTheDocument()
    expect(screen.getByText('Let others send you contact requests to start conversations')).toBeInTheDocument()
  })

  it('shows read receipts note', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    expect(screen.getByText(/if you disable read receipts, you won't be able to see read receipts from others either/i)).toBeInTheDocument()
  })

  it('disables reset button when no changes are made', () => {
    renderWithQueryClient(
      <PrivacySettings user={mockUser} onSuccess={mockOnSuccess} />
    )

    const resetButton = screen.getByRole('button', { name: /reset/i })
    expect(resetButton).toBeDisabled()
  })
})