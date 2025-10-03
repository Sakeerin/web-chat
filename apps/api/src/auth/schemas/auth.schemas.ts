import { z } from 'zod'
import { EmailSchema, PasswordSchema, UsernameSchema } from '../../common/schemas/common.schemas'

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  username: UsernameSchema,
  name: z.string().min(1).max(100),
})

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export const RequestPasswordResetSchema = z.object({
  email: EmailSchema,
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: PasswordSchema,
})

export const LogoutSchema = z.object({
  sessionId: z.string().uuid().optional(),
})

// Export types
export type RegisterDto = z.infer<typeof RegisterSchema>
export type LoginDto = z.infer<typeof LoginSchema>
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>
export type RequestPasswordResetDto = z.infer<typeof RequestPasswordResetSchema>
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>
export type LogoutDto = z.infer<typeof LogoutSchema>