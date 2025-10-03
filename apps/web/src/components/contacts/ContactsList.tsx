import { useState } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { Input } from '@ui/components/input'
import { useContacts, useRemoveContact } from '@/hooks/useContacts'
import { useContactsStore } from '@/stores/contactsStore'
import type { Contact } from '@/types/contacts'
import { ContactCard } from './ContactCard'
import { ContactActions } from './ContactActions'

interface ContactsListProps {
  onContactSelect?: (contact: Contact) => void
  showActions?: boolean
}

export function ContactsList({ onContactSelect, showActions = true }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  
  const { contacts, contactsLoading, contactsError, hasMoreContacts } = useContactsStore()
  const { isLoading, error, refetch } = useContacts()
  const removeContactMutation = useRemoveContact()

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact)
    onContactSelect?.(contact)
  }

  const handleRemoveContact = async (contactId: string) => {
    if (window.confirm('Are you sure you want to remove this contact?')) {
      try {
        await removeContactMutation.mutateAsync(contactId)
      } catch (error) {
        console.error('Failed to remove contact:', error)
      }
    }
  }

  const handleLoadMore = () => {
    // TODO: Implement pagination
    console.log('Load more contacts')
  }

  if (isLoading || contactsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading contacts...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || contactsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="text-sm text-destructive">
              {(error as Error)?.message || contactsError || 'Failed to load contacts'}
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts ({contacts.length})</CardTitle>
        <div className="pt-2">
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredContacts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">
              {searchQuery ? 'No contacts found matching your search.' : 'No contacts yet.'}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="relative group">
                <ContactCard
                  contact={contact}
                  onClick={() => handleContactClick(contact)}
                  isSelected={selectedContact?.id === contact.id}
                />
                {showActions && (
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ContactActions
                      contact={contact}
                      onRemove={() => handleRemoveContact(contact.id)}
                      onBlock={() => {
                        // This will be handled by the ContactActions component
                      }}
                      onReport={() => {
                        // This will be handled by the ContactActions component
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {hasMoreContacts && (
              <div className="pt-4">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}