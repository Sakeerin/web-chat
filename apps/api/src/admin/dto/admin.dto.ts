import { z } from 'zod'

// User management DTOs
export const SuspendUserSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().min(1).max(500),
  duration: z.number().int().positive().optional(), // Duration in hours
})

export const BanUserSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().min(1).max(500),
  permanent: z.boolean().default(false),
})

export const UpdateUserRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['USER', 'MODERATOR', 'ADMIN']),
})

// Report management DTOs
export const ReviewReportSchema = z.object({
  reportId: z.string().cuid(),
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  resolution: z.string().min(1).max(1000).optional(),
})

export const GetReportsSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

// Analytics DTOs
export const GetAnalyticsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metric: z.enum(['users', 'messages', 'reports', 'conversations']).optional(),
})

// Audit log DTOs
export const GetAuditLogsSchema = z.object({
  adminId: z.string().cuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

// Content moderation DTOs
export const DeleteMessageSchema = z.object({
  messageId: z.string(),
  reason: z.string().min(1).max(500),
})

export const DeleteConversationSchema = z.object({
  conversationId: z.string().cuid(),
  reason: z.string().min(1).max(500),
})

// Type exports
export type SuspendUserDto = z.infer<typeof SuspendUserSchema>
export type BanUserDto = z.infer<typeof BanUserSchema>
export type UpdateUserRoleDto = z.infer<typeof UpdateUserRoleSchema>
export type ReviewReportDto = z.infer<typeof ReviewReportSchema>
export type GetReportsDto = z.infer<typeof GetReportsSchema>
export type GetAnalyticsDto = z.infer<typeof GetAnalyticsSchema>
export type GetAuditLogsDto = z.infer<typeof GetAuditLogsSchema>
export type DeleteMessageDto = z.infer<typeof DeleteMessageSchema>
export type DeleteConversationDto = z.infer<typeof DeleteConversationSchema>