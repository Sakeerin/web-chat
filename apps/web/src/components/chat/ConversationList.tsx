import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Button } from '@ui/components/button'
import { ConversationListItem } from './ConversationListItem'
import { CreateConversationDialog } from './CreateConversationDialog'
import { useConversations, useConversationSearch } from '@/hooks/useConversations'
import { useChatStore } from '@/stores/chatStore'
import { useVirtualScroll } from '@/hooks/useVirtualScroll'
import { useDebounce } from '@/hooks/useMemoization'
import { LazyAvatar } from '@/components/ui/LazyImage'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/services/conversationsApi'

interface ConversationListProps {
  className?: string
}

export const ConversationList: React.FC<ConversationListProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [containerHeight, setContainerHeight] = useState(400)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  
  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  const {
    conversations,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useConversations()

  const { data: searchResults } = useConversationSearch({
    query: debouncedSearchQuery,
    limit: 20,
  })

  const { activeConversationId, setActiveConversation, onlineUsers } = useChatStore()

  // Use search results if searching, otherwise use regular conversations
  const displayConversations = useMemo(() => {
    if (debouncedSearchQuery.trim()) {
      return searchResults?.conversations || []
    }
    return conversations
  }, [debouncedSearchQuery, searchResults, conversations])

  // Virtual scrolling for large conversation lists
  const {
    virtualItems,
    totalSize,
    scrollToIndex,
    isScrolling
  } = useVirtualScroll({
    itemHeight: 72, // Fixed height for conversation items
    containerHeight,
    itemCount: displayConversations.length,
    overscan: 5,
    getScrollElement: () => scrollElementRef.current,
  })

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const headerHeight = 120 // Approximate header height
        setContainerHeight(containerRef.current.clientHeight - headerHeight)
      }
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Handle conversation selection
  const handleConversationClick = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation.id)
  }, [setActiveConversation])

  // Load more conversations when scrolling near the end
  useEffect(() => {
    if (virtualItems.length > 0 && !debouncedSearchQuery) {
      const lastVisibleIndex = virtualItems[virtualItems.length - 1].index
      const threshold = Math.max(displayConversations.length - 5, 0)
      
      if (lastVisibleIndex >= threshold && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }
  }, [virtualItems, displayConversations.length, hasNextPage, isFetchingNextPage, fetchNextPage, debouncedSearchQuery])

  // Scroll to active conversation when it changes
  useEffect(() => {
    if (activeConversationId && displayConversations.length > 0) {
      const activeIndex = displayConversations.findIndex(c => c.id === activeConversationId)
      if (activeIndex >= 0) {
        scrollToIndex(activeIndex, 'center')
      }
    }
  }, [activeConversationId, displayConversations, scrollToIndex])

  if (isError) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-600 mb-2">Failed to load conversations</p>
            <p className="text-sm text-gray-500 mb-4">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
            <Button onClick={() => window.location.reload()} size="sm">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="text-sm"
          >
            New Chat
          </Button>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <div className="text-sm text-gray-500">Loading conversations...</div>
            </div>
          </div>
        ) : displayConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              {debouncedSearchQuery ? (
                <>
                  <p className="text-gray-500 mb-2">No conversations found</p>
                  <p className="text-sm text-gray-400">
                    Try adjusting your search terms
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-2">No conversations yet</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Start a new conversation to get chatting
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)} size="sm">
                    Start Chatting
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full relative">
            <div
              ref={scrollElementRef}
              className="h-full overflow-auto"
              style={{
                scrollBehavior: isScrolling ? 'auto' : 'smooth',
                willChange: 'scroll-position',
                transform: 'translateZ(0)', // Force hardware acceleration
              }}
            >
              <div style={{ height: totalSize, position: 'relative' }}>
                {virtualItems.map((virtualItem) => {
                  const conversation = displayConversations[virtualItem.index]
                  if (!conversation) return null
                  
                  return (
                    <div
                      key={conversation.id}
                      style={{
                        position: 'absolute',
                        top: virtualItem.start,
                        left: 0,
                        right: 0,
                        height: virtualItem.size,
                      }}
                    >
                      <ConversationListItem
                        conversation={conversation}
                        isActive={conversation.id === activeConversationId}
                        onClick={() => handleConversationClick(conversation)}
                        onlineUsers={onlineUsers}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Loading indicator for pagination */}
            {isFetchingNextPage && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-4 bg-white border-t border-gray-100">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                <span className="ml-2 text-sm text-gray-500">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create conversation dialog */}
      <CreateConversationDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  )
}