import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { MessageItem } from './MessageItem'
import { TypingIndicator } from './TypingIndicator'
import { useMessages } from '@/hooks/useMessages'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useVirtualScroll, VirtualScrollItem } from '@/hooks/useVirtualScroll'
import { useDynamicVirtualScroll } from '@/hooks/useVirtualScroll'
import { usePerformanceMonitor } from '@/utils/performance'
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider'
import { formatMessageForScreenReader, formatTypingIndicator } from '@/utils/accessibility'
import type { MessageWithRelations } from '@shared/types'

interface MessageListProps {
  conversationId: string
  onReply?: (message: MessageWithRelations) => void
  className?: string
}

interface VirtualMessageItemProps {
  message: MessageWithRelations
  index: number
  isOwn: boolean
  showAvatar: boolean
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onReply?: (message: MessageWithRelations) => void
  measureItem: (index: number, size: number) => void
  style: React.CSSProperties
}

const VirtualMessageItem = React.memo<VirtualMessageItemProps>(({
  message,
  index,
  isOwn,
  showAvatar,
  onEdit,
  onDelete,
  onReply,
  measureItem,
  style
}) => {
  return (
    <VirtualScrollItem
      index={index}
      measureItem={measureItem}
      style={style}
    >
      <MessageItem
        message={message}
        isOwn={isOwn}
        showAvatar={showAvatar}
        onEdit={onEdit}
        onDelete={onDelete}
        onReply={onReply}
      />
    </VirtualScrollItem>
  )
})

export const MessageList: React.FC<MessageListProps> = ({
  conversationId,
  onReply,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(400)
  const { user } = useAuthStore()
  const { typingUsers } = useChatStore()
  const { measureFunction } = usePerformanceMonitor()
  const { announce } = useAccessibility()
  
  const {
    messages,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    editMessage,
    deleteMessage
  } = useMessages(conversationId)

  // Estimate message height based on content
  const estimateMessageHeight = useCallback((index: number) => {
    const message = messages[index]
    if (!message) return 80
    
    // Base height for message container
    let height = 60
    
    // Add height for content (rough estimation)
    const contentLines = Math.ceil(message.content.length / 50)
    height += contentLines * 20
    
    // Add height for attachments
    if (message.attachments?.length > 0) {
      height += message.attachments.length * 100
    }
    
    // Add height for reply context
    if (message.replyToId) {
      height += 40
    }
    
    return Math.min(height, 300) // Cap at 300px
  }, [messages])

  // Virtual scrolling with dynamic heights
  const {
    virtualItems,
    totalSize,
    scrollToIndex,
    isScrolling,
    measureItem
  } = useDynamicVirtualScroll({
    containerHeight,
    itemCount: messages.length,
    estimateItemSize: estimateMessageHeight,
    overscan: 3,
    getScrollElement: () => scrollElementRef.current,
  })

  // Filter typing users for current conversation
  const conversationTypingUsers = useMemo(() => 
    typingUsers.filter(u => u.conversationId === conversationId && u.userId !== user?.id),
    [typingUsers, conversationId, user?.id]
  )

  // Announce new messages to screen readers
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      const isOwn = latestMessage.senderId === user?.id
      
      if (!isOwn && latestMessage.createdAt) {
        const announcement = formatMessageForScreenReader(
          latestMessage.sender?.name || 'Unknown user',
          latestMessage.content,
          new Date(latestMessage.createdAt),
          false
        )
        announce(announcement, 'polite')
      }
    }
  }, [messages, user?.id, announce])

  // Announce typing indicators
  useEffect(() => {
    if (conversationTypingUsers.length > 0) {
      const userNames = conversationTypingUsers.map(u => u.userName || 'Someone')
      const announcement = formatTypingIndicator(userNames)
      announce(announcement, 'polite')
    }
  }, [conversationTypingUsers, announce])

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight - 60) // Account for typing indicator
      }
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Scroll to bottom with a small delay to ensure rendering
      setTimeout(() => {
        scrollToIndex(messages.length - 1, 'end')
      }, 100)
    }
  }, [messages.length, scrollToIndex])

  // Load more messages when scrolling near top
  useEffect(() => {
    if (virtualItems.length > 0) {
      const firstVisibleIndex = virtualItems[0].index
      if (firstVisibleIndex < 5 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleEdit = useCallback(measureFunction('message-edit', (messageId: string, content: string) => {
    editMessage({ messageId, updates: { content } })
  }), [editMessage, measureFunction])

  const handleDelete = useCallback(measureFunction('message-delete', (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage(messageId)
    }
  }), [deleteMessage, measureFunction])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <div className="text-gray-500">Loading messages...</div>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="text-gray-500 mb-2">No messages yet</div>
          <div className="text-sm text-gray-400">Start the conversation!</div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* Loading indicator for pagination */}
      {isFetchingNextPage && (
        <div 
          className="flex justify-center py-2 border-b border-gray-200"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
              aria-hidden="true"
            />
            <div className="text-sm text-gray-500">Loading more messages...</div>
          </div>
        </div>
      )}
      
      {/* Virtual scrolled message list */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={scrollElementRef}
          className="h-full overflow-auto"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
          aria-atomic="false"
          style={{ 
            scrollBehavior: isScrolling ? 'auto' : 'smooth',
            // Optimize scrolling performance
            willChange: 'scroll-position',
            transform: 'translateZ(0)', // Force hardware acceleration
          }}
        >
          <div style={{ height: totalSize, position: 'relative' }}>
            {virtualItems.map((virtualItem) => {
              const message = messages[virtualItem.index]
              const prevMessage = virtualItem.index > 0 ? messages[virtualItem.index - 1] : null
              
              if (!message) return null
              
              const isOwn = message.senderId === user?.id
              const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId
              
              return (
                <VirtualMessageItem
                  key={message.id}
                  message={message}
                  index={virtualItem.index}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReply={onReply}
                  measureItem={measureItem}
                  style={{
                    position: 'absolute',
                    top: virtualItem.start,
                    left: 0,
                    right: 0,
                    height: virtualItem.size,
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Typing indicator */}
      {conversationTypingUsers.length > 0 && (
        <div 
          className="px-4 py-2 border-t border-gray-200 bg-white"
          role="status"
          aria-live="polite"
          aria-label="Typing indicator"
        >
          <TypingIndicator users={conversationTypingUsers} />
        </div>
      )}
    </div>
  )
}