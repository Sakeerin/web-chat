import {
  formatMessageForScreenReader,
  formatTypingIndicator,
  formatConversationStatus,
  formatAttachmentForScreenReader,
  getContrastRatio,
  meetsContrastRequirement,
  isActivationKey,
  isNavigationKey,
  isEscapeKey,
  generateId
} from './accessibility'

describe('Accessibility Utilities', () => {
  describe('formatMessageForScreenReader', () => {
    it('formats own messages correctly', () => {
      const timestamp = new Date('2023-12-01T10:30:00Z')
      const result = formatMessageForScreenReader('John', 'Hello world', timestamp, true)
      expect(result).toMatch(/^You said at \d{1,2}:\d{2} (AM|PM): Hello world$/)
    })

    it('formats other messages correctly', () => {
      const timestamp = new Date('2023-12-01T10:30:00Z')
      const result = formatMessageForScreenReader('Alice', 'How are you?', timestamp, false)
      expect(result).toMatch(/^Alice said at \d{1,2}:\d{2} (AM|PM): How are you\?$/)
    })
  })

  describe('formatTypingIndicator', () => {
    it('handles empty array', () => {
      const result = formatTypingIndicator([])
      expect(result).toBe('')
    })

    it('handles single user', () => {
      const result = formatTypingIndicator(['Alice'])
      expect(result).toBe('Alice is typing')
    })

    it('handles two users', () => {
      const result = formatTypingIndicator(['Alice', 'Bob'])
      expect(result).toBe('Alice and Bob are typing')
    })

    it('handles multiple users', () => {
      const result = formatTypingIndicator(['Alice', 'Bob', 'Charlie'])
      expect(result).toBe('Alice, Bob, and Charlie are typing')
    })
  })

  describe('formatConversationStatus', () => {
    it('formats basic conversation status', () => {
      const result = formatConversationStatus('General', 5, 0)
      expect(result).toBe('Conversation General, 5 members')
    })

    it('includes unread count', () => {
      const result = formatConversationStatus('General', 5, 3)
      expect(result).toBe('Conversation General, 5 members, 3 unread messages')
    })

    it('handles single unread message', () => {
      const result = formatConversationStatus('General', 5, 1)
      expect(result).toBe('Conversation General, 5 members, 1 unread message')
    })

    it('includes last message time', () => {
      const lastMessage = new Date('2023-12-01T10:30:00Z')
      const result = formatConversationStatus('General', 5, 0, lastMessage)
      expect(result).toContain('last message at')
    })

    it('handles DM conversations', () => {
      const result = formatConversationStatus('Alice', 2, 0)
      expect(result).toBe('Conversation Alice')
    })
  })

  describe('formatAttachmentForScreenReader', () => {
    it('formats image attachment', () => {
      const result = formatAttachmentForScreenReader('photo.jpg', 1024 * 1024, 'image/jpeg')
      expect(result).toBe('image attachment: photo.jpg, 1.0 MB')
    })

    it('formats video attachment', () => {
      const result = formatAttachmentForScreenReader('video.mp4', 5 * 1024 * 1024, 'video/mp4')
      expect(result).toBe('video attachment: video.mp4, 5.0 MB')
    })

    it('formats document attachment', () => {
      const result = formatAttachmentForScreenReader('document.pdf', 512 * 1024, 'application/pdf')
      expect(result).toBe('application attachment: document.pdf, 0.5 MB')
    })
  })

  describe('getContrastRatio', () => {
    it('calculates contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff')
      expect(ratio).toBeCloseTo(21, 0)
    })

    it('calculates contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#000000', '#000000')
      expect(ratio).toBe(1)
    })

    it('calculates contrast ratio for gray colors', () => {
      const ratio = getContrastRatio('#808080', '#ffffff')
      expect(ratio).toBeGreaterThan(1)
      expect(ratio).toBeLessThan(21)
    })
  })

  describe('meetsContrastRequirement', () => {
    it('passes AA requirement for high contrast', () => {
      const result = meetsContrastRequirement('#000000', '#ffffff', 'AA', 'normal')
      expect(result).toBe(true)
    })

    it('fails AA requirement for low contrast', () => {
      const result = meetsContrastRequirement('#cccccc', '#ffffff', 'AA', 'normal')
      expect(result).toBe(false)
    })

    it('has different requirements for large text', () => {
      const result = meetsContrastRequirement('#767676', '#ffffff', 'AA', 'large')
      expect(result).toBe(true)
    })

    it('has stricter AAA requirements', () => {
      const result = meetsContrastRequirement('#595959', '#ffffff', 'AAA', 'normal')
      expect(result).toBe(true)
    })
  })

  describe('keyboard event utilities', () => {
    it('identifies activation keys', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' })

      expect(isActivationKey(enterEvent)).toBe(true)
      expect(isActivationKey(spaceEvent)).toBe(true)
      expect(isActivationKey(tabEvent)).toBe(false)
    })

    it('identifies navigation keys', () => {
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' })
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })

      expect(isNavigationKey(arrowEvent)).toBe(true)
      expect(isNavigationKey(homeEvent)).toBe(true)
      expect(isNavigationKey(enterEvent)).toBe(false)
    })

    it('identifies escape key', () => {
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })

      expect(isEscapeKey(escapeEvent)).toBe(true)
      expect(isEscapeKey(enterEvent)).toBe(false)
    })
  })

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('uses custom prefix', () => {
      const id = generateId('test')
      expect(id).toMatch(/^test-/)
    })

    it('generates IDs of consistent format', () => {
      const id = generateId('prefix')
      expect(id).toMatch(/^prefix-[a-z0-9]{9}$/)
    })
  })
})