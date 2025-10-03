import React from 'react'
import { formatTypingIndicator } from '@/utils/accessibility'

interface TypingUser {
  userId: string
  userName: string
  conversationId: string
}

interface TypingIndicatorProps {
  users: TypingUser[]
  className?: string
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users,
  className = ''
}) => {
  if (users.length === 0) return null

  const userNames = users.map(user => user.userName)
  const displayText = formatTypingIndicator(userNames)

  return (
    <div 
      className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={displayText}
    >
      {/* Animated dots */}
      <div className="flex gap-1" aria-hidden="true">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      
      {/* Text for screen readers and visual users */}
      <span>
        {displayText}
      </span>
    </div>
  )
}