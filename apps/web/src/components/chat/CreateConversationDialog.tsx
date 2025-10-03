import React, { useState } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { useContacts } from '@/hooks/useContacts'
import { useConversations } from '@/hooks/useConversations'

import type { Contact } from '@/types/contacts'

interface CreateConversationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const CreateConversationDialog: React.FC<CreateConversationDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [conversationType, setConversationType] = useState<'dm' | 'group'>('dm')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [groupTitle, setGroupTitle] = useState('')
  const [groupDescription, setGroupDescription] = useState('')

  const { data: contactsData } = useContacts()
  const contacts = contactsData?.contacts || []
  const { createConversation, isCreating, createError } = useConversations()


  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleCreate = () => {
    if (selectedContacts.length === 0) return

    createConversation({
      type: conversationType,
      participantIds: selectedContacts,
      ...(conversationType === 'group' && groupTitle && {
        title: groupTitle,
      }),
      ...(conversationType === 'group' && groupDescription && {
        description: groupDescription,
      }),
    })
  }

  // Handle successful creation
  React.useEffect(() => {
    if (!isCreating && !createError) {
      // Reset form and close dialog on successful creation
      setSelectedContacts([])
      setGroupTitle('')
      setGroupDescription('')
      setConversationType('dm')
      onClose()
    }
  }, [isCreating, createError, onClose])

  const canCreate = selectedContacts.length > 0 && 
    (conversationType === 'dm' ? selectedContacts.length === 1 : selectedContacts.length >= 1)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <CardHeader>
          <CardTitle>New Conversation</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {/* Conversation type selector */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <Button
                variant={conversationType === 'dm' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setConversationType('dm')
                  setSelectedContacts(prev => prev.slice(0, 1)) // Keep only first contact for DM
                }}
              >
                Direct Message
              </Button>
              <Button
                variant={conversationType === 'group' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConversationType('group')}
              >
                Group Chat
              </Button>
            </div>
          </div>

          {/* Group details (only for group chats) */}
          {conversationType === 'group' && (
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Contact selection */}
          <div className="flex-1 overflow-hidden">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Select Contacts {conversationType === 'dm' ? '(1)' : `(${selectedContacts.length})`}
            </h3>
            
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {contacts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No contacts available
                  </div>
                ) : (
                  contacts.map((contact: Contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => {
                        if (conversationType === 'dm') {
                          setSelectedContacts([contact.id])
                        } else {
                          handleContactToggle(contact.id)
                        }
                      }}
                    >
                      <input
                        type={conversationType === 'dm' ? 'radio' : 'checkbox'}
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => {}} // Handled by onClick above
                        className="mr-3"
                      />
                      
                      <div className="flex items-center flex-1">
                        {contact.avatarUrl ? (
                          <img
                            src={contact.avatarUrl}
                            alt={contact.name}
                            className="w-8 h-8 rounded-full object-cover mr-3"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                            <span className="text-gray-600 text-sm font-medium">
                              {contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <div>
                          <p className="font-medium text-gray-900">
                            {contact.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            @{contact.username}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Error display */}
          {createError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                Failed to create conversation: {createError instanceof Error ? createError.message : 'Unknown error'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}