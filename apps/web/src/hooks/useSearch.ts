import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo } from 'react'
import { 
  searchApi, 
  searchStorage,
  type MessageSearchParams,
  type UserSearchParams,
  type ConversationSearchParams,
  type GlobalSearchParams,
  type SearchSuggestionsParams,
  type SearchHistoryItem,
  type SavedSearch,
} from '@/services/searchApi'

// Query keys
export const searchKeys = {
  all: ['search'] as const,
  messages: (params: MessageSearchParams) => [...searchKeys.all, 'messages', params] as const,
  users: (params: UserSearchParams) => [...searchKeys.all, 'users', params] as const,
  conversations: (params: ConversationSearchParams) => [...searchKeys.all, 'conversations', params] as const,
  global: (params: GlobalSearchParams) => [...searchKeys.all, 'global', params] as const,
  suggestions: (params: SearchSuggestionsParams) => [...searchKeys.all, 'suggestions', params] as const,
}

// Message search hook
export function useMessageSearch(params: MessageSearchParams) {
  return useQuery({
    queryKey: searchKeys.messages(params),
    queryFn: () => searchApi.searchMessages(params),
    enabled: !!params.q && params.q.length > 0,
    staleTime: 30000, // 30 seconds
  })
}

// Infinite message search for pagination
export function useInfiniteMessageSearch(params: Omit<MessageSearchParams, 'offset'>) {
  return useInfiniteQuery({
    queryKey: searchKeys.messages({ ...params, offset: 0 }),
    queryFn: ({ pageParam = 0 }) => 
      searchApi.searchMessages({ ...params, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.hits.length, 0)
      return totalFetched < lastPage.estimatedTotalHits ? totalFetched : undefined
    },
    enabled: !!params.q && params.q.length > 0,
    staleTime: 30000,
  })
}

// User search hook
export function useUserSearch(params: UserSearchParams) {
  return useQuery({
    queryKey: searchKeys.users(params),
    queryFn: () => searchApi.searchUsers(params),
    enabled: !!params.q && params.q.length > 0,
    staleTime: 30000,
  })
}

// Conversation search hook
export function useConversationSearch(params: ConversationSearchParams) {
  return useQuery({
    queryKey: searchKeys.conversations(params),
    queryFn: () => searchApi.searchConversations(params),
    enabled: !!params.q && params.q.length > 0,
    staleTime: 30000,
  })
}

// Global search hook
export function useGlobalSearch(params: GlobalSearchParams) {
  return useQuery({
    queryKey: searchKeys.global(params),
    queryFn: () => searchApi.globalSearch(params),
    enabled: !!params.q && params.q.length > 0,
    staleTime: 30000,
  })
}

// Search suggestions hook
export function useSearchSuggestions(params: SearchSuggestionsParams) {
  return useQuery({
    queryKey: searchKeys.suggestions(params),
    queryFn: () => searchApi.getSearchSuggestions(params),
    enabled: !!params.q && params.q.length >= 2, // Only suggest after 2+ characters
    staleTime: 60000, // 1 minute
  })
}

// Search history and saved searches hooks
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => 
    searchStorage.getSearchHistory()
  )

  const addToHistory = useCallback((item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => {
    searchStorage.addToSearchHistory(item)
    setHistory(searchStorage.getSearchHistory())
  }, [])

  const removeFromHistory = useCallback((id: string) => {
    searchStorage.removeFromSearchHistory(id)
    setHistory(searchStorage.getSearchHistory())
  }, [])

  const clearHistory = useCallback(() => {
    searchStorage.clearSearchHistory()
    setHistory([])
  }, [])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  }
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => 
    searchStorage.getSavedSearches()
  )

  const saveSearch = useCallback((search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSearch = searchStorage.saveSearch(search)
    setSavedSearches(searchStorage.getSavedSearches())
    return newSearch
  }, [])

  const updateSavedSearch = useCallback((id: string, updates: Partial<Pick<SavedSearch, 'name' | 'query' | 'filters'>>) => {
    searchStorage.updateSavedSearch(id, updates)
    setSavedSearches(searchStorage.getSavedSearches())
  }, [])

  const deleteSavedSearch = useCallback((id: string) => {
    searchStorage.deleteSavedSearch(id)
    setSavedSearches(searchStorage.getSavedSearches())
  }, [])

  return {
    savedSearches,
    saveSearch,
    updateSavedSearch,
    deleteSavedSearch,
  }
}

// Combined search hook with debouncing and history management
export function useSearchWithHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'global' | 'messages' | 'users' | 'conversations'>('global')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [isSearching, setIsSearching] = useState(false)
  
  const { addToHistory } = useSearchHistory()
  
  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  // Debounce search query
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search suggestions
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSearchSuggestions({
    q: searchQuery,
    limit: 5,
  })

  // Global search
  const globalSearchResult = useGlobalSearch({
    q: debouncedQuery,
    limit: 20,
  })

  // Message search
  const messageSearchResult = useMessageSearch({
    q: debouncedQuery,
    limit: 20,
    ...filters,
  })

  // User search
  const userSearchResult = useUserSearch({
    q: debouncedQuery,
    limit: 20,
    ...filters,
  })

  // Conversation search
  const conversationSearchResult = useConversationSearch({
    q: debouncedQuery,
    limit: 20,
    ...filters,
  })

  // Get current search result based on type
  const currentSearchResult = useMemo(() => {
    switch (searchType) {
      case 'global':
        return globalSearchResult
      case 'messages':
        return messageSearchResult
      case 'users':
        return userSearchResult
      case 'conversations':
        return conversationSearchResult
      default:
        return globalSearchResult
    }
  }, [searchType, globalSearchResult, messageSearchResult, userSearchResult, conversationSearchResult])

  // Handle search execution
  const executeSearch = useCallback((query: string, type: typeof searchType = 'global') => {
    if (!query.trim()) return
    
    setSearchQuery(query)
    setSearchType(type)
    setIsSearching(true)
    
    // Add to search history when search is executed
    if (currentSearchResult.data) {
      const resultCount = type === 'global' 
        ? currentSearchResult.data.totalResults 
        : currentSearchResult.data.estimatedTotalHits || 0
      
      addToHistory({
        query,
        type,
        resultCount,
      })
    }
  }, [currentSearchResult.data, addToHistory])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedQuery('')
    setIsSearching(false)
    setFilters({})
  }, [])

  return {
    // Search state
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    searchType,
    setSearchType,
    filters,
    setFilters,
    isSearching,
    
    // Search results
    globalResult: globalSearchResult,
    messageResult: messageSearchResult,
    userResult: userSearchResult,
    conversationResult: conversationSearchResult,
    currentResult: currentSearchResult,
    
    // Suggestions
    suggestions,
    isLoadingSuggestions,
    
    // Actions
    executeSearch,
    clearSearch,
  }
}

// Hook for search result highlighting
export function useSearchHighlight() {
  const highlightText = useCallback((text: string, query: string) => {
    if (!query || !text) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }, [])

  const stripHighlight = useCallback((text: string) => {
    return text.replace(/<\/?mark>/g, '')
  }, [])

  return {
    highlightText,
    stripHighlight,
  }
}