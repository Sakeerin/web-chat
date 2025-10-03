
import { cn } from '@ui/utils'
import type { Contact } from '@/types/contacts'

interface ContactCardProps {
  contact: Contact
  onClick?: () => void
  isSelected?: boolean
  showStatus?: boolean
}

export function ContactCard({ 
  contact, 
  onClick, 
  isSelected = false, 
  showStatus = true 
}: ContactCardProps) {
  const formatLastSeen = (lastSeenAt?: Date) => {
    if (!lastSeenAt) return null
    
    const now = new Date()
    const lastSeen = new Date(lastSeenAt)
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return lastSeen.toLocaleDateString()
  }

  return (
    <div
      className={cn(
        'flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent',
        isSelected && 'bg-accent border-primary',
        onClick && 'hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt={contact.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-primary">
              {contact.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        {/* Online status indicator */}
        {showStatus && contact.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>

      {/* Contact info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium truncate">{contact.name}</h3>
          <span className="text-xs text-muted-foreground">@{contact.username}</span>
        </div>
        
        {contact.bio && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {contact.bio}
          </p>
        )}
        
        {showStatus && (
          <div className="text-xs text-muted-foreground mt-1">
            {contact.isOnline ? (
              <span className="text-green-600">Online</span>
            ) : contact.lastSeenAt ? (
              <span>Last seen {formatLastSeen(contact.lastSeenAt)}</span>
            ) : (
              <span>Last seen recently</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}