import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConversationList } from './ConversationList'

import { vi } from 'vitest'

// Mock the hooks
vi.mock('@/hooks/useConversations', () => ({
  useConversations: () => ({
    conversations: [],
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }),
  useConversationSearch: () => ({
    data: null,
  }),
}))

vi.mock('@/stores/chatStore', () => ({
  useChatStore: () => ({
    activeConversationId: null,
    setActiveConversation: vi.fn(),
    onlineUsers: new Set(),
  }),
}))

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('ConversationList', () => {
  it('renders without crashing', () => {
    renderWithQueryClient(<ConversationList />)
    expect(screen.getByText('Chats')).toBeInTheDocument()
  })

  it('shows empty state when no conversations', () => {
    renderWithQueryClient(<ConversationList />)
    expect(screen.getByText('No conversations yet')).toBeInTheDocument()
  })

  it('shows new chat button', () => {
    renderWithQueryClient(<ConversationList />)
    expect(screen.getByText('New Chat')).toBeInTheDocument()
  })

  it('shows search input', () => {
    renderWithQueryClient(<ConversationList />)
    expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument()
  })
})