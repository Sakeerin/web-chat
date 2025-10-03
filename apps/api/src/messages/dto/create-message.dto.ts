import { IsString, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator'
import { MessageType } from '@prisma/client'

export class CreateMessageDto {
  @IsString()
  conversationId: string

  @IsEnum(MessageType)
  type: MessageType = MessageType.TEXT

  @IsString()
  @MaxLength(10000) // 10KB text limit
  content: string

  @IsOptional()
  @IsString()
  replyToId?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}