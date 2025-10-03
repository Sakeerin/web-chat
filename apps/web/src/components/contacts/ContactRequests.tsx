import { useState } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { usePendingContactRequests, useSentContactRequests, useRespondToContactRequest } from '@/hooks/useContacts'
import { useContactsStore } from '@/stores/contactsStore'
import type { ContactRequest } from '@/types/contacts'

interface ContactRequestCardProps {
  request: ContactRequest
  type: 'received' | 'sent'
  onRespond?: (requestId: string, status: 'ACCEPTED' | 'DECLINED') => void
}

function ContactRequestCard({ request, type, onRespond }: ContactRequestCardProps) {
  const [isResponding, setIsResponding] = useState(false)
  
  const user = type === 'received' ? request.sender : request.receiver
  
  const handleRespond = async (status: 'ACCEPTED' | 'DECLINED') => {
    if (!onRespond) return
    
    setIsResponding(true)
    try {
      await onRespond(request.id, status)
    } finally {
      setIsResponding(false)
    }
  }

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

      {/* Request info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium">{user.name}</h3>
          <span className="text-xs text-muted-foreground">@{user.username}</span>
        </div>
        
        {request.message && (
          <p className="text-xs text-muted-foreground mt-1">
            "{request.message}"
          </p>
        )}
        
        <p className="text-xs text-muted-foreground mt-1">
          {type === 'received' ? 'Wants to connect with you' : 'Contact request sent'}
        </p>
      </div>

      {/* Actions */}
      {type === 'received' && (
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={() => handleRespond('ACCEPTED')}
            disabled={isResponding}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRespond('DECLINED')}
            disabled={isResponding}
          >
            Decline
          </Button>
        </div>
      )}
      
      {type === 'sent' && (
        <div className="text-xs text-muted-foreground">
          Pending
        </div>
      )}
    </div>
  )
}

export function ContactRequests() {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
  
  const { pendingRequests, sentRequests, requestsLoading, requestsError } = useContactsStore()
  const { isLoading: pendingLoading } = usePendingContactRequests()
  const { isLoading: sentLoading } = useSentContactRequests()
  const respondMutation = useRespondToContactRequest()

  const handleRespond = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await respondMutation.mutateAsync({ requestId, data: { status } })
    } catch (error) {
      console.error('Failed to respond to contact request:', error)
      alert('Failed to respond to contact request. Please try again.')
    }
  }

  const isLoading = pendingLoading || sentLoading || requestsLoading
  const error = requestsError

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading requests...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const receivedCount = pendingRequests.length
  const sentCount = sentRequests.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Requests</CardTitle>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'received'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Received ({receivedCount})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'sent'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sent ({sentCount})
          </button>
        </div>
      </CardHeader>
      
      <CardContent>
        {activeTab === 'received' && (
          <div className="space-y-3">
            {receivedCount === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">
                  No pending contact requests
                </div>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <ContactRequestCard
                  key={request.id}
                  request={request}
                  type="received"
                  onRespond={handleRespond}
                />
              ))
            )}
          </div>
        )}
        
        {activeTab === 'sent' && (
          <div className="space-y-3">
            {sentCount === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">
                  No sent contact requests
                </div>
              </div>
            ) : (
              sentRequests.map((request) => (
                <ContactRequestCard
                  key={request.id}
                  request={request}
                  type="sent"
                />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}