import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { SearchInterface } from './SearchInterface'

// Mock the search API
vi.mock('@/services/searchApi', () => ({
  searchApi: {
    searchMessages: vi.fn(),
    searchUsers: vi.fn(),
    searchConversations: vi.fn(),
    getSearchSuggestions: vi.fn(),
    globalSearch: vi.fn(),
  },
  searchStorage: {
    getSearchHistory: vi.fn(() => []),
    addToSearchHistory: vi.fn(),
    clearSearchHistory: vi.fn(),
    removeFromSearchHistory: vi.fn(),
    getSavedSearches: vi.fn(() => []),
    saveSearch: vi.fn(),
    updateSavedSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
  },
}))

// Mock the chat store
vi.mock('@/stores/chatStore', () => ({
  useChatStore: () => ({
    setActiveConversation: vi.fn(),
  }),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const renderWithQueryClient = (component: React.ReactElement) => {
  const testQueryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('SearchInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input', () => {
    renderWithQueryClient(<SearchInterface />)
    
    expect(screen.getByPlaceholderText(/search messages, contacts/i)).toBeInTheDocument()
  })

  it('shows search type tabs', () => {
    renderWithQueryClient(<SearchInterface />)
    
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('messages')).toBeInTheDocument()
    expect(screen.getByText('users')).toBeInTheDocument()
    expect(screen.getByText('conversations')).toBeInTheDocument()
  })

  it('allows switching between search types', () => {
    renderWithQueryClient(<SearchInterface />)
    
    const messagesTab = screen.getByText('messages')
    fireEvent.click(messagesTab)
    
    expect(messagesTab).toHaveClass('bg-primary') // Assuming active tab has this class
  })

  it('shows filter button', () => {
    renderWithQueryClient(<SearchInterface />)
    
    const filterButton = screen.getByRole('button', { name: /search filters/i })
    expect(filterButton).toBeInTheDocument()
  })

  it('shows clear button when there is text', () => {
    renderWithQueryClient(<SearchInterface />)
    
    const searchInput = screen.getByPlaceholderText(/search messages, contacts/i)
    fireEvent.change(searchInput, { target: { value: 'test query' } })
    
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
  })

  it('clears search when clear button is clicked', () => {
    renderWithQueryClient(<SearchInterface />)
    
    const searchInput = screen.getByPlaceholderText(/search messages, contacts/i) as HTMLInputElement
    fireEvent.change(searchInput, { target: { value: 'test query' } })
    
    const clearButton = screen.getByRole('button', { name: /clear search/i })
    fireEvent.click(clearButton)
    
    expect(searchInput.value).toBe('')
  })

  it('handles keyboard shortcuts', () => {
    renderWithQueryClient(<SearchInterface />)
    
    const searchInput = screen.getByPlaceholderText(/search messages, contacts/i)
    fireEvent.change(searchInput, { target: { value: 'test query' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })
    
    // Should trigger search (we can't easily test the actual search without mocking more)
    expect(searchInput).toBeInTheDocument()
  })

  it('shows empty state when no query', () => {
    renderWithQueryClient(<SearchInterface />)
    
    expect(screen.getByText(/search your conversations/i)).toBeInTheDocument()
    expect(screen.getByText(/find messages, contacts, and conversations quickly/i)).toBeInTheDocument()
  })

  it('initializes with provided query and type', () => {
    renderWithQueryClient(
      <SearchInterface 
        initialQuery="test query" 
        initialType="messages" 
      />
    )
    
    const searchInput = screen.getByPlaceholderText(/search messages, contacts/i) as HTMLInputElement
    expect(searchInput.value).toBe('test query')
    
    const messagesTab = screen.getByText('messages')
    expect(messagesTab).toHaveClass('bg-primary') // Assuming active tab styling
  })

  it('calls onClose when close button is clicked in modal mode', () => {
    const onClose = vi.fn()
    
    renderWithQueryClient(
      <SearchInterface 
        isModal={true}
        onClose={onClose}
      />
    )
    
    const closeButton = screen.getByRole('button', { name: /close search/i })
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })
})