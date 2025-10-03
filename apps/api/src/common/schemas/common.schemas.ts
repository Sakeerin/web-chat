import { z } from 'zod'

// Common validation schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  ...PaginationSchema.shape,
})

// User-related schemas
export const UsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must be at most 255 characters')

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')

// Message-related schemas
export const MessageContentSchema = z
  .string()
  .min(1, 'Message content cannot be empty')
  .max(4000, 'Message content must be at most 4000 characters')

export const ConversationTypeSchema = z.enum(['dm', 'group', 'channel'])

// File upload schemas
export const FileTypeSchema = z.enum(['image', 'video', 'audio', 'document'])

export const FileSizeSchema = z
  .number()
  .int()
  .min(1, 'File size must be at least 1 byte')
  .max(50 * 1024 * 1024, 'File size must be at most 50MB')

// Export types
export type PaginationDto = z.infer<typeof PaginationSchema>
export type IdParamDto = z.infer<typeof IdParamSchema>
export type SearchQueryDto = z.infer<typeof SearchQuerySchema>