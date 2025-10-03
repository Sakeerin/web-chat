import { apiService, endpoints } from './api'

// Search result types
export interface SearchResult<T = any> {
  hits: T[]
  query: string
  processingTimeMs: number
  limit: number
  offset: number
  estimatedTotalHits: number
}

export interface MessageSearchResult {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderUsername: string
  content: string
  type: string
  createdAt: number
  hasAttachments: boolean
  attachmentTypes: string[]
  isReply: boolean
  replyToContent?: string
  _formatted?: {
    content?: string
    senderName?: string
  }
}

export interface UserSearchResult {
  id: string
  username: string
  name: string
  bio?: string
  avatarUrl?: string
  createdAt: number
  isActive: boolean
  _formatted?: {
    username?: string
    name?: string
    bio?: string
  }
}

export interface ConversationSearchResult {
  id: string
  type: string
  title?: string
  memberIds: string[]
  memberNames: string
  memberUsernames: string
  createdAt: number
  updatedAt: number
  _formatted?: {
    title?: string
    memberNames?: string
  }
}

export interface SearchSuggestion {
  text: string
  type: 'recent' | 'popular' | 'contact'
  metadata?: Record<string, any>
}

// Search parameters
export interface MessageSearchParams {
  q: string
  conversationId?: string
  limit?: number
  offset?: number
  dateFrom?: string
  dateTo?: string
  messageTypes?: string
  hasAttachments?: boolean
}

export interface UserSearchParams {
  q: string
  limit?: number
  offset?: number
  excludeBlocked?: boolean
}

export interface ConversationSearchParams {
  q: string
  limit?: number
  offset?: number
  type?: 'dm' | 'group' | 'channel'
}

export interface SearchSuggestionsParams {
  q: string
  limit?: number
}

// Global search parameters
export interface GlobalSearchParams {
  q: string
  types?: ('messages' | 'users' | 'conversations')[]
  limit?: number
  offset?: number
}

export interface GlobalSearchResult {
  messages: SearchResult<MessageSearchResult>
  users: SearchResult<UserSearchResult>
  conversations: SearchResult<ConversationSearchResult>
  totalResults: number
  processingTimeMs: number
}

// Search history
export interface SearchHistoryItem {
  id: string
  query: string
  type: 'messages' | 'users' | 'conversations' | 'global'
  timestamp: number
  resultCount: number
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  type: 'messages' | 'users' | 'conversations' | 'global'
  filters?: Record<string, any>
  createdAt: number
  updatedAt: number
}

export const searchApi = {
  // Message search
  async searchMessages(params: MessageSearchParams): Promise<SearchResult<MessageSearchResult>> {
    const searchParams = new URLSearchParams()
    searchParams.append('q', params.q)
    
    if (params.conversationId) searchParams.append('conversationId', params.conversationId)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params.messageTypes) searchParams.append('messageTypes', params.messageTypes)
    if (params.hasAttachments !== undefined) searchParams.append('hasAttachments', params.hasAttachments.toString())
    
    return apiService.get<SearchResult<MessageSearchResult>>(
      `${endpoints.search.messages}?${searchParams.toString()}`
    )
  },

  // User search
  async searchUsers(params: UserSearchParams): Promise<SearchResult<UserSearchResult>> {
    const searchParams = new URLSearchParams()
    searchParams.append('q', params.q)
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    if (params.excludeBlocked !== undefined) searchParams.append('excludeBlocked', params.excludeBlocked.toString())
    
    return apiService.get<SearchResult<UserSearchResult>>(
      `${endpoints.search.users}?${searchParams.toString()}`
    )
  },

  // Conversation search
  async searchConversations(params: ConversationSearchParams): Promise<SearchResult<ConversationSearchResult>> {
    const searchParams = new URLSearchParams()
    searchParams.append('q', params.q)
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    if (params.type) searchParams.append('type', params.type)
    
    return apiService.get<SearchResult<ConversationSearchResult>>(
      `${endpoints.search.conversations}?${searchParams.toString()}`
    )
  },

  // Get search suggestions
  async getSearchSuggestions(params: SearchSuggestionsParams): Promise<SearchSuggestion[]> {
    const searchParams = new URLSearchParams()
    searchParams.append('q', params.q)
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    
    return apiService.get<SearchSuggestion[]>(
      `/search/suggestions?${searchParams.toString()}`
    )
  },

  // Global search (searches all types)
  async globalSearch(params: GlobalSearchParams): Promise<GlobalSearchResult> {
    const searchParams = new URLSearchParams()
    searchParams.append('q', params.q)
    
    if (params.types) searchParams.append('types', params.types.join(','))
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    
    // Since the backend doesn't have a global search endpoint, we'll make parallel requests
    const promises: Promise<any>[] = []
    const types = params.types || ['messages', 'users', 'conversations']
    
    const messagePromise = types.includes('messages') 
      ? this.searchMessages({ q: params.q, limit: params.limit, offset: params.offset })
      : Promise.resolve({ hits: [], query: params.q, processingTimeMs: 0, limit: 0, offset: 0, estimatedTotalHits: 0 })
    
    const userPromise = types.includes('users')
      ? this.searchUsers({ q: params.q, limit: params.limit, offset: params.offset })
      : Promise.resolve({ hits: [], query: params.q, processingTimeMs: 0, limit: 0, offset: 0, estimatedTotalHits: 0 })
    
    const conversationPromise = types.includes('conversations')
      ? this.searchConversations({ q: params.q, limit: params.limit, offset: params.offset })
      : Promise.resolve({ hits: [], query: params.q, processingTimeMs: 0, limit: 0, offset: 0, estimatedTotalHits: 0 })
    
    const [messages, users, conversations] = await Promise.all([
      messagePromise,
      userPromise,
      conversationPromise,
    ])
    
    return {
      messages,
      users,
      conversations,
      totalResults: messages.estimatedTotalHits + users.estimatedTotalHits + conversations.estimatedTotalHits,
      processingTimeMs: Math.max(messages.processingTimeMs, users.processingTimeMs, conversations.processingTimeMs),
    }
  },
}

// Local storage helpers for search history and saved searches
export const searchStorage = {
  // Search history
  getSearchHistory(): SearchHistoryItem[] {
    try {
      const history = localStorage.getItem('search-history')
      return history ? JSON.parse(history) : []
    } catch {
      return []
    }
  },

  addToSearchHistory(item: Omit<SearchHistoryItem, 'id' | 'timestamp'>): void {
    try {
      const history = this.getSearchHistory()
      const newItem: SearchHistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }
      
      // Remove duplicate queries
      const filteredHistory = history.filter(h => h.query !== item.query || h.type !== item.type)
      
      // Add new item to the beginning and limit to 50 items
      const updatedHistory = [newItem, ...filteredHistory].slice(0, 50)
      
      localStorage.setItem('search-history', JSON.stringify(updatedHistory))
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  },

  clearSearchHistory(): void {
    try {
      localStorage.removeItem('search-history')
    } catch (error) {
      console.error('Failed to clear search history:', error)
    }
  },

  removeFromSearchHistory(id: string): void {
    try {
      const history = this.getSearchHistory()
      const updatedHistory = history.filter(h => h.id !== id)
      localStorage.setItem('search-history', JSON.stringify(updatedHistory))
    } catch (error) {
      console.error('Failed to remove from search history:', error)
    }
  },

  // Saved searches
  getSavedSearches(): SavedSearch[] {
    try {
      const saved = localStorage.getItem('saved-searches')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  },

  saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): SavedSearch {
    try {
      const saved = this.getSavedSearches()
      const newSearch: SavedSearch = {
        ...search,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      
      const updatedSaved = [newSearch, ...saved].slice(0, 20) // Limit to 20 saved searches
      localStorage.setItem('saved-searches', JSON.stringify(updatedSaved))
      
      return newSearch
    } catch (error) {
      console.error('Failed to save search:', error)
      throw error
    }
  },

  updateSavedSearch(id: string, updates: Partial<Pick<SavedSearch, 'name' | 'query' | 'filters'>>): void {
    try {
      const saved = this.getSavedSearches()
      const updatedSaved = saved.map(s => 
        s.id === id 
          ? { ...s, ...updates, updatedAt: Date.now() }
          : s
      )
      localStorage.setItem('saved-searches', JSON.stringify(updatedSaved))
    } catch (error) {
      console.error('Failed to update saved search:', error)
    }
  },

  deleteSavedSearch(id: string): void {
    try {
      const saved = this.getSavedSearches()
      const updatedSaved = saved.filter(s => s.id !== id)
      localStorage.setItem('saved-searches', JSON.stringify(updatedSaved))
    } catch (error) {
      console.error('Failed to delete saved search:', error)
    }
  },
}