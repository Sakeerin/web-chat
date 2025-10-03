import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ContactCard } from './ContactCard'
import type { Contact } from '@/types/contacts'

const mockContact: Contact = {
  id: '1',
  username: 'johndoe',
  name: 'John Doe',
  bio: 'Software developer',
  avatarUrl: 'https://example.com/avatar.jpg',
  lastSeenAt: new Date('2023-12-01T10:00:00Z'),
  isOnline: false,
  contactedAt: new Date('2023-11-01T10:00:00Z'),
}

const mockOnlineContact: Contact = {
  ...mockContact,
  id: '2',
  isOnline: true,
}

describe('ContactCard', () => {
  it('renders contact information correctly', () => {
    render(<ContactCard contact={mockContact} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('@johndoe')).toBeInTheDocument()
    expect(screen.getByText('Software developer')).toBeInTheDocument()
  })

  it('displays avatar image when avatarUrl is provided', () => {
    render(<ContactCard contact={mockContact} />)
    
    const avatar = screen.getByAltText('John Doe')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('displays initials when no avatar is provided', () => {
    const contactWithoutAvatar = { ...mockContact, avatarUrl: undefined }
    render(<ContactCard contact={contactWithoutAvatar} />)
    
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('shows online status indicator for online users', () => {
    render(<ContactCard contact={mockOnlineContact} />)
    
    expect(screen.getByText('Online')).toBeInTheDocument()
    // Check for online indicator dot
    const onlineIndicator = document.querySelector('.bg-green-500')
    expect(onlineIndicator).toBeInTheDocument()
  })

  it('shows last seen time for offline users', () => {
    render(<ContactCard contact={mockContact} />)
    
    expect(screen.getByText(/Last seen/)).toBeInTheDocument()
  })

  it('handles click events', () => {
    const mockOnClick = vi.fn()
    render(<ContactCard contact={mockContact} onClick={mockOnClick} />)
    
    const cardElement = screen.getByText('John Doe').closest('div')!
    fireEvent.click(cardElement)
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('applies selected styling when isSelected is true', () => {
    render(<ContactCard contact={mockContact} isSelected={true} />)
    
    // Find the main card container (the outermost div with the styling)
    const cardElement = screen.getByText('John Doe').closest('[class*="bg-accent"]')
    expect(cardElement).toBeInTheDocument()
    expect(cardElement).toHaveClass('bg-accent')
  })

  it('hides status when showStatus is false', () => {
    render(<ContactCard contact={mockOnlineContact} showStatus={false} />)
    
    expect(screen.queryByText('Online')).not.toBeInTheDocument()
    const onlineIndicator = document.querySelector('.bg-green-500')
    expect(onlineIndicator).not.toBeInTheDocument()
  })

  it('handles contact without bio', () => {
    const contactWithoutBio = { ...mockContact, bio: undefined }
    render(<ContactCard contact={contactWithoutBio} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Software developer')).not.toBeInTheDocument()
  })

  it('formats last seen time correctly', () => {
    // Test different time formats
    const now = new Date()
    
    // Just now
    const justNowContact = { 
      ...mockContact, 
      lastSeenAt: new Date(now.getTime() - 30 * 1000), // 30 seconds ago
      isOnline: false 
    }
    const { rerender } = render(<ContactCard contact={justNowContact} />)
    expect(screen.getByText(/Just now/)).toBeInTheDocument()
    
    // Minutes ago
    const minutesAgoContact = { 
      ...mockContact, 
      lastSeenAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
      isOnline: false 
    }
    rerender(<ContactCard contact={minutesAgoContact} />)
    expect(screen.getByText(/5m ago/)).toBeInTheDocument()
    
    // Hours ago
    const hoursAgoContact = { 
      ...mockContact, 
      lastSeenAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      isOnline: false 
    }
    rerender(<ContactCard contact={hoursAgoContact} />)
    expect(screen.getByText(/2h ago/)).toBeInTheDocument()
  })
})