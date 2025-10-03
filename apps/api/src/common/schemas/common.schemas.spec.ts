import {
  PaginationSchema,
  IdParamSchema,
  SearchQuerySchema,
  UsernameSchema,
  EmailSchema,
  PasswordSchema,
  MessageContentSchema,
  ConversationTypeSchema,
  FileTypeSchema,
  FileSizeSchema,
} from './common.schemas'

describe('Common Schemas', () => {
  describe('PaginationSchema', () => {
    it('should validate valid pagination data', () => {
      const validData = { page: 1, limit: 20 }
      const result = PaginationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should apply defaults', () => {
      const result = PaginationSchema.parse({})
      expect(result).toEqual({ page: 1, limit: 20 })
    })

    it('should reject invalid pagination data', () => {
      const invalidData = { page: 0, limit: 101 }
      const result = PaginationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('UsernameSchema', () => {
    it('should validate valid usernames', () => {
      const validUsernames = ['user123', 'test_user', 'USERNAME']
      validUsernames.forEach(username => {
        const result = UsernameSchema.safeParse(username)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid usernames', () => {
      const invalidUsernames = ['ab', 'user-name', 'user@name', 'a'.repeat(31)]
      invalidUsernames.forEach(username => {
        const result = UsernameSchema.safeParse(username)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('EmailSchema', () => {
    it('should validate valid emails', () => {
      const validEmails = ['test@example.com', 'user.name+tag@domain.co.uk']
      validEmails.forEach(email => {
        const result = EmailSchema.safeParse(email)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid emails', () => {
      const invalidEmails = ['invalid-email', '@domain.com', 'user@']
      invalidEmails.forEach(email => {
        const result = EmailSchema.safeParse(email)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('PasswordSchema', () => {
    it('should validate strong passwords', () => {
      const validPasswords = ['Password123', 'MySecure1Pass', 'Test123456']
      validPasswords.forEach(password => {
        const result = PasswordSchema.safeParse(password)
        expect(result.success).toBe(true)
      })
    })

    it('should reject weak passwords', () => {
      const invalidPasswords = ['weak', 'password', '12345678', 'PASSWORD']
      invalidPasswords.forEach(password => {
        const result = PasswordSchema.safeParse(password)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('MessageContentSchema', () => {
    it('should validate message content', () => {
      const validContent = 'Hello, world!'
      const result = MessageContentSchema.safeParse(validContent)
      expect(result.success).toBe(true)
    })

    it('should reject empty or too long content', () => {
      const emptyContent = ''
      const tooLongContent = 'a'.repeat(4001)
      
      expect(MessageContentSchema.safeParse(emptyContent).success).toBe(false)
      expect(MessageContentSchema.safeParse(tooLongContent).success).toBe(false)
    })
  })

  describe('ConversationTypeSchema', () => {
    it('should validate conversation types', () => {
      const validTypes = ['dm', 'group', 'channel']
      validTypes.forEach(type => {
        const result = ConversationTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid conversation types', () => {
      const invalidTypes = ['private', 'public', 'room']
      invalidTypes.forEach(type => {
        const result = ConversationTypeSchema.safeParse(type)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('FileSizeSchema', () => {
    it('should validate file sizes within limits', () => {
      const validSizes = [1024, 1024 * 1024, 50 * 1024 * 1024] // 1KB, 1MB, 50MB
      validSizes.forEach(size => {
        const result = FileSizeSchema.safeParse(size)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid file sizes', () => {
      const invalidSizes = [0, -1, 51 * 1024 * 1024] // 0, negative, over 50MB
      invalidSizes.forEach(size => {
        const result = FileSizeSchema.safeParse(size)
        expect(result.success).toBe(false)
      })
    })
  })
})