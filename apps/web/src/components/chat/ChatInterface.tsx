import React, { useState, useEffect } from 'react'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { useMessages } from '@/hooks/useMessages'

import { socketService } from '@/services/socket'
import type { MessageWithRelations, ConversationWithMembers } from '@shared/types'

interface ChatInterfaceProps {
  conversation: ConversationWithMembers
  className?: string
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  className = ''
}) => {
  const [replyTo, setReplyTo] = useState<MessageWithRelations | null>(null)
  const { sendMessage } = useMessages(conversation.id)

  // Join conversation room when component mounts
  useEffect(() => {
    if (conversation.id) {
      socketService.joinRoom(conversation.id)
      
      return () => {
        socketService.leaveRoom(conversation.id)
      }
    }
    return undefined
  }, [conversation.id])

  const handleSendMessage = (content: string, replyToId?: string) => {
    sendMessage({
      conversationId: conversation.id,
      content,
      type: 'text',
      ...(replyToId && { replyToId })
    })
    
    // Clear reply
    if (replyTo) {
      setReplyTo(null)
    }
  }

  const handleReply = (message: MessageWithRelations) => {
    setReplyTo(message)
  }

  const handleCancelReply = () => {
    setReplyTo(null)
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <ChatHeader conversation={conversation} />
      
      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          conversationId={conversation.id}
          onReply={handleReply}
          className="h-full"
        />
      </div>
      
      {/* Composer */}
      <MessageComposer
        conversationId={conversation.id}
        replyTo={replyTo}
        onSend={handleSendMessage}
        onCancelReply={handleCancelReply}
      />
    </div>
  )
}