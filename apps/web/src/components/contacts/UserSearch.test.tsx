import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UserSearch } from './UserSearch'
import { useContactsStore } from '@/stores/contactsStore'
import { useAuthStore } from '@/stores/authStore'
import * as contactsHooks from '@/hooks/useContacts'

// Mock the stores and hooks
vi.mock('@/stores/contactsStore')
vi.mock('@/stores/authStore')
vi.mock('@/hooks/useContacts')

const mockUseContactsStore = useContactsStore as vi.MockedFunction<typeof useContactsStore>
const mockUseAuthStore = useAuthStore as vi.MockedFunction<typeof useAuthStore>
const mockUseUserSearch = vi.spyOn(contactsHooks, 'useUserSearch')
const mockUseSendContactRequest = vi.spyOn(contactsHooks, 'useSendContactRequest')

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

const mockSearchResults = [
  {
    id: '1',
    username: 'johndoe',
    name: 'John Doe',
    bio: 'Software developer',
    avatarUrl: 'https://example.com/avatar1.jpg',
    isContact: false,
    isBlocked: false,
  },
  {
    id: '2',
    username: 'janedoe',
    name: 'Jane Doe',
    bio: 'Designer',
    isContact: true,
    isBlocked: false,
  },
  {
    id: '3',
    username: 'blockeduser',
    name: 'Blocked User',
    isContact: false,
    isBlocked: true,
  },
]

describe('UserSearch', () => {
  beforeEach(() => {
    mockUseContactsStore.mockReturnValue({
      searchResults: [],
      searchLoading: false,
      searchError: null,
      searchQuery: '',
      setSearchResults: vi.fn(),
      setSearchLoading: vi.fn(),
      setSearchError: vi.fn(),
      setSearchQuery: vi.fn(),
      clearSearch: vi.fn(),
      // Add other required properties with default values
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
      reset: vi.fn(),
    })

    mockUseAuthStore.mockReturnValue({
      user: { id: 'current-user', username: 'currentuser', email: 'current@example.com', name: 'Current User' },
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

    mockUseUserSearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    mockUseSendContactRequest.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input and initial state', () => {
    renderWithProviders(<UserSearch />)
    
    expect(screen.getByPlaceholderText('Search by username or name...')).toBeInTheDocument()
    expect(screen.getByText('Start typing to search for people')).toBeInTheDocument()
  })

  it('shows loading state when searching', () => {
    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      searchLoading: true,
      searchQuery: 'john',
    })

    renderWithProviders(<UserSearch />)
    
    expect(screen.getByText('Searching...')).toBeInTheDocument()
  })

  it('displays search results', () => {
    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      searchResults: mockSearchResults,
      searchQuery: 'doe',
    })

    renderWithProviders(<UserSearch />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Blocked User')).toBeInTheDocument()
  })

  it('shows appropriate status for different user types', () => {
    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      searchResults: mockSearchResults,
      searchQuery: 'doe',
    })

    renderWithProviders(<UserSearch />)
    
    // Regular user should show "Add Contact" button
    expect(screen.getByText('Add Contact')).toBeInTheDocument()
    
    // Contact should show "Already connected"
    expect(screen.getByText('Already connected')).toBeInTheDocument()
    
    // Blocked user should show "Blocked"
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('handles search input changes with debouncing', async () => {
    const mockSetSearchQuery = vi.fn()
    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      setSearchQuery: mockSetSearchQuery,
    })

    renderWithProviders(<UserSearch />)
    
    const searchInput = screen.getByPlaceholderText('Search by username or name...')
    fireEvent.change(searchInput, { target: { value: 'john' } })
    
    // Should not call immediately (debounced)
    expect(mockSetSearchQuery).not.toHaveBeenCalled()
    
    // Should call after debounce delay
    await waitFor(() => {
      expect(mockSetSearchQuery).toHaveBeenCalledWith('john')
    }, { timeout: 500 })
  })

  it('handles sending contact request', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    mockUseSendContactRequest.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any)

    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      searchResults: [mockSearchResults[0]], // Only the non-contact user
      searchQuery: 'john',
    })

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    renderWithProviders(<UserSearch />)
    
    fireEvent.click(screen.getByText('Add Contact'))
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        username: 'johndoe',
        message: undefined,
      })
    })

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Contact request sent successfully!')
    })

    alertSpy.mockRestore()
  })

  it('handles sending contact request with message', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    mockUseSendContactRequest.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any)

    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      searchResults: [mockSearchResults[0]],
      searchQuery: 'john',
    })

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    renderWithProviders(<UserSearch />)
    
    // Click to show message input
    fireEvent.click(screen.getByText('Add Contact'))
    
    // Type message
    const messageInput = screen.getByPlaceholderText('Add a message (optional)')
    fireEvent.change(messageInput, { target: { value: 'Hello!' } })
    
    // Send request
    fireEvent.click(screen.getByText('Send Request'))
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        username: 'johndoe',
        message: 'Hello!',
      })
    })

    alertSpy.mockRestore()
  })

  it('shows no results message when search returns empty', () => {
    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      searchResults: [],
      searchQuery: 'nonexistent',
    })

    renderWithProviders(<UserSearch />)
    
    expect(screen.getByText('No users found matching "nonexistent"')).toBeInTheDocument()
  })

  it('shows error message when search fails', () => {
    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      searchError: 'Search failed',
      searchQuery: 'john',
    })

    renderWithProviders(<UserSearch />)
    
    expect(screen.getByText('Search failed')).toBeInTheDocument()
  })

  it('does not show current user in results', () => {
    const resultsWithCurrentUser = [
      ...mockSearchResults,
      {
        id: 'current-user',
        username: 'currentuser',
        name: 'Current User',
        isContact: false,
        isBlocked: false,
      },
    ]

    mockUseContactsStore.mockReturnValue({
      ...mockUseContactsStore(),
      searchResults: resultsWithCurrentUser,
      searchQuery: 'user',
    })

    renderWithProviders(<UserSearch />)
    
    // Should show "You" for current user
    expect(screen.getByText('You')).toBeInTheDocument()
  })
})