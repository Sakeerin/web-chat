import React from 'react'
import { SocketProvider } from '@/components/chat/SocketProvider'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useChatStore } from '@/stores/chatStore'

const ChatPage: React.FC = () => {
  const { activeConversationId, conversations } = useChatStore()
  
  // Find the active conversation
  const activeConversation = conversations.find(c => c.id === activeConversationId)

  return (
    <SocketProvider>
      <div className="h-screen flex bg-white">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          <ConversationList className="flex-1" />
        </div>
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <ChatInterface conversation={activeConversation} className="h-full" />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome to Telegram Web Chat
                </h2>
                <p className="text-gray-600">
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </SocketProvider>
  )
}

export default ChatPage