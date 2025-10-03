import React from 'react'
import { render, screen } from '@testing-library/react'
import { TypingIndicator } from './TypingIndicator'

describe('TypingIndicator', () => {
  it('renders nothing when no users are typing', () => {
    const { container } = render(<TypingIndicator users={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows single user typing', () => {
    const users = [
      { userId: '1', username: 'alice', conversationId: 'conv-1' }
    ]
    
    render(<TypingIndicator users={users} />)
    expect(screen.getByText('alice is typing...')).toBeInTheDocument()
  })

  it('shows two users typing', () => {
    const users = [
      { userId: '1', username: 'alice', conversationId: 'conv-1' },
      { userId: '2', username: 'bob', conversationId: 'conv-1' }
    ]
    
    render(<TypingIndicator users={users} />)
    expect(screen.getByText('alice and bob are typing...')).toBeInTheDocument()
  })

  it('shows multiple users typing', () => {
    const users = [
      { userId: '1', username: 'alice', conversationId: 'conv-1' },
      { userId: '2', username: 'bob', conversationId: 'conv-1' },
      { userId: '3', username: 'charlie', conversationId: 'conv-1' }
    ]
    
    render(<TypingIndicator users={users} />)
    expect(screen.getByText('alice and 2 others are typing...')).toBeInTheDocument()
  })

  it('shows animated dots', () => {
    const users = [
      { userId: '1', username: 'alice', conversationId: 'conv-1' }
    ]
    
    render(<TypingIndicator users={users} />)
    
    // Check for animated dots
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-bounce')
    )
    expect(dots).toHaveLength(3)
  })
})