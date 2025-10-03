import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageItem } from './MessageItem'
import type { MessageWithRelations } from '@shared/types'

const mockMessage: MessageWithRelations = {
  id: '1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  type: 'text',
  content: 'Hello, world!',
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2023-01-01T12:00:00Z'),
  editedAt: null,
  deletedAt: null,
  replyToId: null,
  metadata: {},
  sender: {
    id: 'user-1',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: undefined
  },
  replyTo: undefined,
  attachments: [],
  edits: [],
  _count: { receipts: 0 }
}

describe('MessageItem', () => {
  it('renders message content', () => {
    render(
      <MessageItem 
        message={mockMessage} 
        isOwn={false} 
      />
    )
    
    expect(screen.getByText('Hello, world!')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('shows edit and delete buttons for own messages', () => {
    render(
      <MessageItem 
        message={mockMessage} 
        isOwn={true} 
      />
    )
    
    // Hover to show actions
    const messageElement = screen.getByText('Hello, world!').closest('.group')
    if (messageElement) {
      fireEvent.mouseEnter(messageElement)
    }
    
    // Should show edit and delete buttons (emojis)
    expect(screen.getByText('✏️')).toBeInTheDocument()
    expect(screen.getByText('🗑️')).toBeInTheDocument()
  })

  it('shows reply button for all messages', () => {
    render(
      <MessageItem 
        message={mockMessage} 
        isOwn={false} 
      />
    )
    
    // Hover to show actions
    const messageElement = screen.getByText('Hello, world!').closest('.group')
    if (messageElement) {
      fireEvent.mouseEnter(messageElement)
    }
    
    // Should show reply button
    expect(screen.getByText('↩️')).toBeInTheDocument()
  })

  it('handles deleted messages', () => {
    const deletedMessage = {
      ...mockMessage,
      isDeleted: true,
      deletedAt: new Date()
    }
    
    render(
      <MessageItem 
        message={deletedMessage} 
        isOwn={false} 
      />
    )
    
    expect(screen.getByText('This message was deleted')).toBeInTheDocument()
  })

  it('shows edit indicator for edited messages', () => {
    const editedMessage = {
      ...mockMessage,
      isEdited: true,
      editedAt: new Date()
    }
    
    render(
      <MessageItem 
        message={editedMessage} 
        isOwn={false} 
      />
    )
    
    expect(screen.getByText('(edited)')).toBeInTheDocument()
  })
})