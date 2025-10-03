import { useState, useEffect } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { Input } from '@ui/components/input'
import { useUserSearch, useSendContactRequest } from '@/hooks/useContacts'
import { useContactsStore } from '@/stores/contactsStore'
import { useAuthStore } from '@/stores/authStore'
import type { SearchUser } from '@/types/contacts'

interface UserSearchResultProps {
  user: SearchUser
  onSendRequest: (username: string, message?: string) => void
  isLoading?: boolean
}

function UserSearchResult({ user, onSendRequest, isLoading = false }: UserSearchResultProps) {
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [message, setMessage] = useState('')
  const { user: currentUser } = useAuthStore()

  const handleSendRequest = () => {
    if (showMessageInput) {
      onSendRequest(user.username, message.trim() || undefined)
      setMessage('')
      setShowMessageInput(false)
    } else {
      setShowMessageInput(true)
    }
  }

  const isCurrentUser = currentUser?.id === user.id

  return (
    <div className="flex items-center space-x-3 p-3 border rounded-lg">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-primary">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium">{user.name}</h3>
          <span className="text-xs text-muted-foreground">@{user.username}</span>
        </div>
        
        {user.bio && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {user.bio}
          </p>
        )}
        
        {/* Status indicators */}
        <div className="flex items-center space-x-2 mt-1">
          {user.isContact && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
              Contact
            </span>
          )}
          {user.isBlocked && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
              Blocked
            </span>
          )}
        </div>

        {/* Message input */}
        {showMessageInput && (
          <div className="mt-2">
            <Input
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs"
              maxLength={200}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        {isCurrentUser ? (
          <span className="text-xs text-muted-foreground">You</span>
        ) : user.isBlocked ? (
          <span className="text-xs text-muted-foreground">Blocked</span>
        ) : user.isContact ? (
          <span className="text-xs text-muted-foreground">Already connected</span>
        ) : (
          <>
            {showMessageInput && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowMessageInput(false)
                  setMessage('')
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSendRequest}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : showMessageInput ? 'Send Request' : 'Add Contact'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export function UserSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  const { searchResults, searchLoading, searchError, setSearchQuery } = useContactsStore()
  const sendRequestMutation = useSendContactRequest()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setSearchQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, setSearchQuery])

  // Use the search hook with debounced query
  const { isLoading, error } = useUserSearch({
    query: debouncedQuery,
    limit: 20,
  })

  const handleSendRequest = async (username: string, message?: string) => {
    try {
      await sendRequestMutation.mutateAsync({ 
        username, 
        ...(message && { message })
      })
      alert('Contact request sent successfully!')
    } catch (error) {
      console.error('Failed to send contact request:', error)
      alert('Failed to send contact request. Please try again.')
    }
  }

  const showResults = debouncedQuery.length > 0
  const hasResults = searchResults.length > 0
  const isSearching = isLoading || searchLoading

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find People</CardTitle>
        <div className="pt-2">
          <Input
            placeholder="Search by username or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {!showResults ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">
              Start typing to search for people
            </div>
          </div>
        ) : isSearching ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">
              Searching...
            </div>
          </div>
        ) : error || searchError ? (
          <div className="text-center py-8">
            <div className="text-sm text-destructive">
              {(error as Error)?.message || searchError || 'Search failed'}
            </div>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">
              No users found matching "{debouncedQuery}"
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {searchResults.map((user) => (
              <UserSearchResult
                key={user.id}
                user={user}
                onSendRequest={handleSendRequest}
                isLoading={sendRequestMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}