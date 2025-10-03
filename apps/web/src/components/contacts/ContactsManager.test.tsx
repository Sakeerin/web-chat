import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContactsManager } from './ContactsManager'
import { useContactsStore } from '@/stores/contactsStore'
import { useAuthStore } from '@/stores/authStore'

import { vi } from 'vitest'

// Mock the stores
vi.mock('@/stores/contactsStore')
vi.mock('@/stores/authStore')
vi.mock('@/hooks/useContacts')

const mockUseContactsStore = useContactsStore as any
const mockUseAuthStore = useAuthStore as any

// Mock the child components
vi.mock('./ContactsList', () => ({
  ContactsList: ({ onContactSelect }: any) => (
    <div data-testid="contacts-list">
      <button onClick={() => onContactSelect?.({ id: '1', name: 'Test Contact' })}>
        Select Contact
      </button>
    </div>
  ),
}))

vi.mock('./ContactRequests', () => ({
  ContactRequests: () => <div data-testid="contact-requests">Contact Requests</div>,
}))

vi.mock('./UserSearch', () => ({
  UserSearch: () => <div data-testid="user-search">User Search</div>,
}))

vi.mock('./BlockedUsers', () => ({
  BlockedUsers: () => <div data-testid="blocked-users">Blocked Users</div>,
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('ContactsManager', () => {
  beforeEach(() => {
    // Mock store states
    mockUseContactsStore.mockReturnValue({
      contacts: [],
      contactsLoading: false,
      contactsError: null,
      hasMoreContacts: false,
      pendingRequests: [],
      sentRequests: [],
      requestsLoading: false,
      requestsError: null,
      blockedUsers: [],
      blockedUsersLoading: false,
      blockedUsersError: null,
      hasMoreBlockedUsers: false,
      searchResults: [],
      searchLoading: false,
      searchError: null,
      searchQuery: '',
      setContacts: vi.fn(),
      addContacts: vi.fn(),
      removeContact: vi.fn(),
      setContactsLoading: vi.fn(),
      setContactsError: vi.fn(),
      setPendingRequests: vi.fn(),
      setSentRequests: vi.fn(),
      addContactRequest: vi.fn(),
      updateContactRequest: vi.fn(),
      removeContactRequest: vi.fn(),
      setRequestsLoading: vi.fn(),
      setRequestsError: vi.fn(),
      setBlockedUsers: vi.fn(),
      addBlockedUsers: vi.fn(),
      addBlockedUser: vi.fn(),
      removeBlockedUser: vi.fn(),
      setBlockedUsersLoading: vi.fn(),
      setBlockedUsersError: vi.fn(),
      setSearchResults: vi.fn(),
      setSearchLoading: vi.fn(),
      setSearchError: vi.fn(),
      setSearchQuery: vi.fn(),
      clearSearch: vi.fn(),
      reset: vi.fn(),
    })

    mockUseAuthStore.mockReturnValue({
      user: { id: '1', username: 'testuser', email: 'test@example.com', name: 'Test User' },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
      isLoading: false,
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      setLoading: vi.fn(),
      updateUser: vi.fn(),
      initializeAuth: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default contacts tab active', () => {
    renderWithProviders(<ContactsManager />)
    
    expect(screen.getByTestId('contacts-list')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /contacts/i })).toHaveClass('bg-background')
  })

  it('switches between tabs correctly', async () => {
    renderWithProviders(<ContactsManager />)
    
    // Initially shows contacts
    expect(screen.getByTestId('contacts-list')).toBeInTheDocument()
    
    // Switch to requests tab
    fireEvent.click(screen.getByRole('button', { name: /requests/i }))
    await waitFor(() => {
      expect(screen.getByTestId('contact-requests')).toBeInTheDocument()
    })
    
    // Switch to search tab
    fireEvent.click(screen.getByRole('button', { name: /find people/i }))
    await waitFor(() => {
      expect(screen.getByTestId('user-search')).toBeInTheDocument()
    })
    
    // Switch to blocked tab
    fireEvent.click(screen.getByRole('button', { name: /blocked/i }))
    await waitFor(() => {
      expect(screen.getByTestId('blocked-users')).toBeInTheDocument()
    })
  })

  it('calls onContactSelect when a contact is selected', async () => {
    const mockOnContactSelect = vi.fn()
    renderWithProviders(<ContactsManager onContactSelect={mockOnContactSelect} />)
    
    fireEvent.click(screen.getByText('Select Contact'))
    
    await waitFor(() => {
      expect(mockOnContactSelect).toHaveBeenCalledWith({ id: '1', name: 'Test Contact' })
    })
  })

  it('starts with specified default tab', () => {
    renderWithProviders(<ContactsManager defaultTab="search" />)
    
    expect(screen.getByTestId('user-search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /find people/i })).toHaveClass('bg-background')
  })

  it('renders all tab buttons', () => {
    renderWithProviders(<ContactsManager />)
    
    expect(screen.getByRole('button', { name: /contacts/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /requests/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /find people/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /blocked/i })).toBeInTheDocument()
  })
})