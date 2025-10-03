import React from 'react'
import { PresenceIndicator } from './PresenceIndicator'
import { Button } from '@ui/components/button'
import { MediaGalleryButton } from './MediaGallery'
import { useChatStore } from '@/stores/chatStore'
import type { ConversationWithMembers } from '@shared/types'

interface ChatHeaderProps {
  conversation: ConversationWithMembers
  className?: string
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  className = ''
}) => {
  const { onlineUsers } = useChatStore()

  const getConversationInfo = () => {
    if (conversation.type === 'dm') {
      // For DM, show the other user's info
      const otherMember = conversation.members?.find((m: any) => m.isActive)
      if (otherMember) {
        const isOnline = onlineUsers.has(otherMember.userId)
        return {
          title: otherMember.user.name,
          subtitle: otherMember.user.username,
          avatarUrl: otherMember.user.avatarUrl,
          isOnline,
          lastSeenAt: otherMember.user.lastSeenAt
        }
      }
    }
    
    // For groups
    const memberCount = conversation.members?.filter((m: any) => m.isActive).length || 0
    const onlineMemberCount = conversation.members?.filter((m: any) => 
      m.isActive && onlineUsers.has(m.userId)
    ).length || 0
    
    return {
      title: conversation.title || 'Group Chat',
      subtitle: `${memberCount} members${onlineMemberCount > 0 ? `, ${onlineMemberCount} online` : ''}`,
      avatarUrl: conversation.avatarUrl,
      isOnline: false,
      lastSeenAt: undefined
    }
  }

  const info = getConversationInfo()

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white ${className}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {info.avatarUrl ? (
            <img
              src={info.avatarUrl}
              alt={info.title}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
              {info.title.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Online indicator for DM */}
          {conversation.type === 'dm' && (
            <div className="absolute -bottom-1 -right-1">
              <PresenceIndicator isOnline={info.isOnline} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {info.title}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {conversation.type === 'dm' && info.lastSeenAt ? (
              <PresenceIndicator
                isOnline={info.isOnline}
                lastSeenAt={new Date(info.lastSeenAt)}
                showText
              />
            ) : (
              info.subtitle
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <MediaGalleryButton
          conversationId={conversation.id}
          mediaCount={0} // TODO: Get actual media count from API
        />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          📞
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          📹
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
          ⋮
        </Button>
      </div>
    </div>
  )
}