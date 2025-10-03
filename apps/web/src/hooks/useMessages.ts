import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagesApi, type SendMessageRequest, type EditMessageRequest } from '@/services/messagesApi'
import { useChatStore } from '@/stores/chatStore'
import { socketService } from '@/services/socket'
import type { MessageWithRelations } from '@shared/types'

export const useMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient()
  const { addMessage, updateMessage } = useChatStore()

  // Infinite query for messages
  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) => 
      messagesApi.getMessages({
        conversationId: conversationId!,
        cursor: pageParam,
        limit: 50
      }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: SendMessageRequest) => {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random()}`
      const optimisticMessage: MessageWithRelations = {
        id: tempId,
        conversationId: message.conversationId,
        senderId: '', // Will be filled by auth store
        type: message.type || 'text',
        content: message.content,
        metadata: message.metadata,
        replyToId: message.replyToId || null,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        editedAt: null,
        deletedAt: null,
        sender: {
          id: '',
          username: '',
          name: ''
        },
        replyTo: undefined,
        attachments: [],
        edits: [],
        _count: { receipts: 0 }
      }

      // Add optimistic message to store
      addMessage(optimisticMessage)

      // Send via WebSocket for real-time delivery
      socketService.sendMessage({
        ...message,
        tempId
      })

      return messagesApi.sendMessage(message)
    },
    onSuccess: (data, variables) => {
      // Update query cache with real message
      queryClient.setQueryData(['messages', variables.conversationId], (old: any) => {
        if (!old) return old
        
        // Replace optimistic message with real one
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: MessageWithRelations) => 
            msg.id.startsWith('temp-') && msg.content === data.content ? data : msg
          )
        }))
        
        return { ...old, pages: newPages }
      })
    },
    onError: (error) => {
      console.error('Failed to send message:', error)
      // Remove optimistic message on error
      // Could implement retry logic here
    }
  })

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, updates }: { messageId: string; updates: EditMessageRequest }) =>
      messagesApi.editMessage(messageId, updates),
    onSuccess: (data) => {
      // Update message in store
      updateMessage(data.id, data)
      
      // Update query cache
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old
        
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: MessageWithRelations) => 
            msg.id === data.id ? data : msg
          )
        }))
        
        return { ...old, pages: newPages }
      })
    }
  })

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => messagesApi.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      // Update query cache to mark message as deleted
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old) return old
        
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: MessageWithRelations) => 
            msg.id === messageId ? { ...msg, isDeleted: true, deletedAt: new Date() } : msg
          )
        }))
        
        return { ...old, pages: newPages }
      })
    }
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      messagesApi.markAsRead(conversationId, messageId),
    onSuccess: (_, { conversationId, messageId }) => {
      // Send read receipt via WebSocket
      socketService.markAsRead(conversationId, messageId)
    }
  })

  return {
    messages: messagesQuery.data?.pages.flatMap(page => page.messages) || [],
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    error: messagesQuery.error,
    hasNextPage: messagesQuery.hasNextPage,
    fetchNextPage: messagesQuery.fetchNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    
    sendMessage: sendMessageMutation.mutate,
    editMessage: editMessageMutation.mutate,
    deleteMessage: deleteMessageMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    
    isSending: sendMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending
  }
}