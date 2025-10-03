import React from 'react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/services/conversationsApi'

interface ConversationListItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  onlineUsers: Set<string>
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isActive,
  onClick,
  onlineUsers,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  const getConversationTitle = () => {
    if (conversation.title) {
      return conversation.title
    }

    if (conversation.type === 'dm') {
      // For DMs, show the other participant's name
      const otherMember = conversation.members.find(member => member.userId !== conversation.ownerId)
      return otherMember?.user.name || 'Unknown User'
    }

    return 'Group Chat'
  }

  const getConversationAvatar = () => {
    if (conversation.avatarUrl) {
      return conversation.avatarUrl
    }

    if (conversation.type === 'dm') {
      const otherMember = conversation.members.find(member => member.userId !== conversation.ownerId)
      return otherMember?.user.avatarUrl
    }

    return null
  }

  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) {
      return 'No messages yet'
    }

    const { content, type } = conversation.lastMessage
    
    if (type === 'text') {
      return content.length > 50 ? `${content.substring(0, 50)}...` : content
    }
    
    if (type === 'image') {
      return '📷 Photo'
    }
    
    if (type === 'video') {
      return '🎥 Video'
    }
    
    if (type === 'audio') {
      return '🎵 Voice message'
    }
    
    if (type === 'file') {
      return '📎 File'
    }

    return content
  }

  const isOnline = conversation.type === 'dm' && conversation.members.some(
    member => member.userId !== conversation.ownerId && onlineUsers.has(member.userId)
  )

  const avatarUrl = getConversationAvatar()
  const title = getConversationTitle()
  const lastMessageTime = conversation.lastMessage?.createdAt || conversation.updatedAt
  const hasUnread = (conversation.unreadCount || 0) > 0

  return (
    <div
      className={cn(
        'flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors',
        isActive && 'bg-blue-50 border-r-2 border-blue-500'
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mr-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={title}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-medium text-lg">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Online indicator for DMs */}
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            'font-medium text-gray-900 truncate',
            hasUnread && 'font-semibold'
          )}>
            {title}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {formatTime(lastMessageTime)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className={cn(
            'text-sm text-gray-600 truncate',
            hasUnread && 'font-medium text-gray-900'
          )}>
            {conversation.type === 'group' && conversation.lastMessage && (
              <span className="text-gray-500">
                {conversation.lastMessage.sender.name}: 
              </span>
            )}
            {getLastMessagePreview()}
          </p>
          
          {/* Unread count */}
          {hasUnread && (
            <div className="flex-shrink-0 ml-2">
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full min-w-[20px]">
                {conversation.unreadCount! > 99 ? '99+' : conversation.unreadCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}