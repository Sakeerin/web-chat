import { IsOptional, IsString, MaxLength, IsBoolean, IsObject } from 'class-validator'

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsString()
  avatarUrl?: string

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>
}