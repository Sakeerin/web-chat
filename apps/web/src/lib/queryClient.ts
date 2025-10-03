import { QueryClient } from '@tanstack/react-query'

// Cache configuration based on data type and usage patterns
const CACHE_CONFIG = {
  // Static/rarely changing data
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  },
  // User profile data
  profile: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  // Chat data (conversations, messages)
  chat: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  // Real-time data (presence, typing)
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
  },
  // Search results
  search: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
} as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default cache settings
      staleTime: CACHE_CONFIG.chat.staleTime,
      cacheTime: CACHE_CONFIG.chat.cacheTime,
      // Retry failed requests with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Smart refetch behavior
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Network mode for offline support
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 2
      },
      retryDelay: 1000,
      // Network mode for offline support
      networkMode: 'offlineFirst',
    },
  },
})

// Query keys factory for consistent key management
export const queryKeys = {
  // Auth
  auth: ['auth'] as const,
  profile: ['auth', 'profile'] as const,
  sessions: ['auth', 'sessions'] as const,
  
  // Users
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  userSearch: (query: string) => ['users', 'search', query] as const,
  userProfile: (id: string) => ['users', id, 'profile'] as const,
  
  // Conversations
  conversations: ['conversations'] as const,
  conversation: (id: string) => ['conversations', id] as const,
  conversationMembers: (id: string) => ['conversations', id, 'members'] as const,
  conversationMessages: (id: string, cursor?: string) => 
    cursor ? ['conversations', id, 'messages', cursor] : ['conversations', id, 'messages'] as const,
  
  // Messages
  messages: (conversationId: string) => ['messages', conversationId] as const,
  messageSearch: (query: string, filters?: Record<string, any>) => 
    filters ? ['messages', 'search', query, filters] : ['messages', 'search', query] as const,
  
  // Contacts
  contacts: ['contacts'] as const,
  contactRequests: ['contacts', 'requests'] as const,
  blockedUsers: ['contacts', 'blocked'] as const,
  
  // Search
  search: (query: string, type: string, filters?: Record<string, any>) => 
    filters ? ['search', type, query, filters] : ['search', type, query] as const,
  
  // Media
  media: (conversationId: string) => ['media', conversationId] as const,
  mediaItem: (id: string) => ['media', 'item', id] as const,
} as const

// Cache utilities for advanced cache management
export const cacheUtils = {
  // Invalidate all queries matching a pattern
  invalidateQueries: (pattern: readonly unknown[]) => {
    return queryClient.invalidateQueries({ queryKey: pattern })
  },
  
  // Remove specific queries from cache
  removeQueries: (pattern: readonly unknown[]) => {
    return queryClient.removeQueries({ queryKey: pattern })
  },
  
  // Prefetch data for better UX
  prefetchQuery: <T>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<T>,
    options?: { staleTime?: number; cacheTime?: number }
  ) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: options?.staleTime || CACHE_CONFIG.chat.staleTime,
      cacheTime: options?.cacheTime || CACHE_CONFIG.chat.cacheTime,
    })
  },
  
  // Set query data directly (for optimistic updates)
  setQueryData: <T>(queryKey: readonly unknown[], data: T) => {
    return queryClient.setQueryData(queryKey, data)
  },
  
  // Get cached data
  getQueryData: <T>(queryKey: readonly unknown[]): T | undefined => {
    return queryClient.getQueryData(queryKey)
  },
  
  // Update cache with new data
  updateQueryData: <T>(
    queryKey: readonly unknown[],
    updater: (oldData: T | undefined) => T
  ) => {
    return queryClient.setQueryData(queryKey, updater)
  },
  
  // Cache warming for frequently accessed data
  warmCache: async (userId: string) => {
    // Prefetch user profile
    await cacheUtils.prefetchQuery(
      queryKeys.profile,
      () => fetch(`/api/auth/profile`).then(r => r.json()),
      CACHE_CONFIG.profile
    )
    
    // Prefetch conversations list
    await cacheUtils.prefetchQuery(
      queryKeys.conversations,
      () => fetch(`/api/conversations`).then(r => r.json()),
      CACHE_CONFIG.chat
    )
    
    // Prefetch contacts
    await cacheUtils.prefetchQuery(
      queryKeys.contacts,
      () => fetch(`/api/users/contacts`).then(r => r.json()),
      CACHE_CONFIG.profile
    )
  },
  
  // Clear all cache (for logout)
  clearCache: () => {
    queryClient.clear()
  },
}

// Export cache configuration for use in components
export { CACHE_CONFIG }