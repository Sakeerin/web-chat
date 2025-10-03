/**
 * Accessibility utilities for the chat application
 */

/**
 * Generate unique IDs for ARIA relationships
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format message for screen readers
 */
export const formatMessageForScreenReader = (
  senderName: string,
  content: string,
  timestamp: Date,
  isOwn: boolean = false
): string => {
  const timeString = timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  
  const prefix = isOwn ? 'You said' : `${senderName} said`
  return `${prefix} at ${timeString}: ${content}`
}

/**
 * Format typing indicator for screen readers
 */
export const formatTypingIndicator = (userNames: string[]): string => {
  if (userNames.length === 0) return ''
  
  if (userNames.length === 1) {
    return `${userNames[0]} is typing`
  }
  
  if (userNames.length === 2) {
    return `${userNames[0]} and ${userNames[1]} are typing`
  }
  
  return `${userNames.slice(0, -1).join(', ')}, and ${userNames[userNames.length - 1]} are typing`
}

/**
 * Format conversation status for screen readers
 */
export const formatConversationStatus = (
  title: string,
  memberCount: number,
  unreadCount: number,
  lastMessageTime?: Date
): string => {
  let status = `Conversation ${title}`
  
  if (memberCount > 2) {
    status += `, ${memberCount} members`
  }
  
  if (unreadCount > 0) {
    status += `, ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`
  }
  
  if (lastMessageTime) {
    const timeString = lastMessageTime.toLocaleString()
    status += `, last message at ${timeString}`
  }
  
  return status
}

/**
 * Format file attachment for screen readers
 */
export const formatAttachmentForScreenReader = (
  fileName: string,
  fileSize: number,
  mimeType: string
): string => {
  const sizeInMB = (fileSize / (1024 * 1024)).toFixed(1)
  const fileType = mimeType.split('/')[0] // image, video, audio, etc.
  
  return `${fileType} attachment: ${fileName}, ${sizeInMB} MB`
}

/**
 * Get ARIA role for message type
 */
export const getMessageAriaRole = (messageType: string): string => {
  switch (messageType) {
    case 'system':
      return 'status'
    case 'text':
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
    default:
      return 'article'
  }
}

/**
 * Get ARIA label for button based on context
 */
export const getButtonAriaLabel = (
  action: string,
  context?: string,
  state?: string
): string => {
  let label = action
  
  if (context) {
    label += ` ${context}`
  }
  
  if (state) {
    label += `, ${state}`
  }
  
  return label
}

/**
 * Check if element is visible to screen readers
 */
export const isVisibleToScreenReader = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element)
  
  return !(
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    element.hasAttribute('aria-hidden') ||
    element.getAttribute('aria-hidden') === 'true'
  )
}

/**
 * Announce message to screen readers with debouncing
 */
let announceTimeout: NodeJS.Timeout | null = null

export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
  delay: number = 100
): void => {
  if (announceTimeout) {
    clearTimeout(announceTimeout)
  }
  
  announceTimeout = setTimeout(() => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, delay)
}

/**
 * Color contrast utilities
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255
    
    // Calculate relative luminance
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }
  
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Check if color combination meets WCAG contrast requirements
 */
export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean => {
  const ratio = getContrastRatio(foreground, background)
  
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7
  }
  
  return size === 'large' ? ratio >= 3 : ratio >= 4.5
}

/**
 * Keyboard event utilities
 */
export const isActivationKey = (event: KeyboardEvent): boolean => {
  return event.key === 'Enter' || event.key === ' '
}

export const isNavigationKey = (event: KeyboardEvent): boolean => {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
}

export const isEscapeKey = (event: KeyboardEvent): boolean => {
  return event.key === 'Escape'
}

/**
 * Focus management utilities
 */
export const restoreFocus = (element: HTMLElement | null): void => {
  if (element && typeof element.focus === 'function') {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      element.focus()
    })
  }
}

export const saveFocus = (): HTMLElement | null => {
  return document.activeElement as HTMLElement
}

/**
 * ARIA attributes helpers
 */
export const getAriaExpanded = (isExpanded: boolean): string => {
  return isExpanded.toString()
}

export const getAriaSelected = (isSelected: boolean): string => {
  return isSelected.toString()
}

export const getAriaChecked = (isChecked: boolean | 'mixed'): string => {
  return isChecked.toString()
}

export const getAriaPressed = (isPressed: boolean): string => {
  return isPressed.toString()
}