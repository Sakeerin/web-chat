import React from 'react'
import { formatDistanceToNow } from 'date-fns'

interface PresenceIndicatorProps {
  isOnline: boolean
  lastSeenAt?: Date
  showText?: boolean
  className?: string
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  isOnline,
  lastSeenAt,
  showText = false,
  className = ''
}) => {
  const formatLastSeen = () => {
    if (isOnline) return 'Online'
    if (!lastSeenAt) return 'Last seen unknown'
    
    try {
      return `Last seen ${formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}`
    } catch {
      return 'Last seen unknown'
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status dot */}
      <div className="relative">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        {isOnline && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
        )}
      </div>
      
      {/* Status text */}
      {showText && (
        <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {formatLastSeen()}
        </span>
      )}
    </div>
  )
}