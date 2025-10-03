import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { conversationsApi, type Conversation as ApiConversation, type CreateConversationRequest, type ConversationSearchParams } from '@/services/conversationsApi'

export const useConversations = () => {
  const queryClient = useQueryClient()

  // Infinite query for conversation list with pagination
  const conversationsQuery = useInfiniteQuery({
    queryKey: ['conversations'],
    queryFn: ({ pageParam }) => conversationsApi.getConversations(pageParam),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  })

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (data: CreateConversationRequest) => conversationsApi.createConversation(data),
    onSuccess: (newConversation) => {
      // Add to cache
      queryClient.setQueryData(['conversations'], (oldData: any) => {
        if (!oldData) return { pages: [{ conversations: [newConversation], hasMore: false, total: 1 }], pageParams: [undefined] }
        
        const newPages = [...oldData.pages]
        newPages[0] = {
          ...newPages[0],
          conversations: [newConversation, ...newPages[0].conversations],
          total: newPages[0].total + 1,
        }
        
        return { ...oldData, pages: newPages }
      })
    },
  })

  // Update conversation mutation
  const updateConversationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ApiConversation> }) =>
      conversationsApi.updateConversation(id, updates),
    onSuccess: (updatedConversation) => {
      // Update cache
      queryClient.setQueryData(['conversations'], (oldData: any) => {
        if (!oldData) return oldData
        
        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          conversations: page.conversations.map((conv: ApiConversation) =>
            conv.id === updatedConversation.id ? updatedConversation : conv
          ),
        }))
        
        return { ...oldData, pages: newPages }
      })
    },
  })

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => conversationsApi.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.setQueryData(['conversations'], (oldData: any) => {
        if (!oldData) return oldData
        
        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          conversations: page.conversations.filter((conv: ApiConversation) => conv.id !== deletedId),
          total: page.total - 1,
        }))
        
        return { ...oldData, pages: newPages }
      })
      
      // Invalidate conversations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  return {
    // Queries
    conversations: conversationsQuery.data?.pages.flatMap(page => page.conversations) || [],
    isLoading: conversationsQuery.isLoading,
    isError: conversationsQuery.isError,
    error: conversationsQuery.error,
    hasNextPage: conversationsQuery.hasNextPage,
    isFetchingNextPage: conversationsQuery.isFetchingNextPage,
    fetchNextPage: conversationsQuery.fetchNextPage,
    refetch: conversationsQuery.refetch,

    // Mutations
    createConversation: createConversationMutation.mutate,
    isCreating: createConversationMutation.isPending,
    createError: createConversationMutation.error,

    updateConversation: updateConversationMutation.mutate,
    isUpdating: updateConversationMutation.isPending,
    updateError: updateConversationMutation.error,

    deleteConversation: deleteConversationMutation.mutate,
    isDeleting: deleteConversationMutation.isPending,
    deleteError: deleteConversationMutation.error,
  }
}

export const useConversationSearch = (params: ConversationSearchParams) => {
  return useQuery({
    queryKey: ['conversations', 'search', params],
    queryFn: () => conversationsApi.searchConversations(params),
    enabled: !!params.query && params.query.length > 0,
    staleTime: 30000, // 30 seconds
  })
}

export const useConversation = (id: string) => {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => conversationsApi.getConversation(id),
    enabled: !!id,
  })
}