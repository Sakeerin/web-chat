import { IsEnum, IsOptional, IsBoolean, IsObject, IsDateString } from 'class-validator'
import { ConversationMemberRole } from '@prisma/client'

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(ConversationMemberRole)
  role?: ConversationMemberRole

  @IsOptional()
  @IsBoolean()
  isMuted?: boolean

  @IsOptional()
  @IsDateString()
  mutedUntil?: string

  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>
}