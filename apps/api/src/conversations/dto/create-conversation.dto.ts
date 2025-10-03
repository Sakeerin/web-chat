import { IsEnum, IsOptional, IsString, IsArray, ArrayMinSize, ArrayMaxSize, MaxLength } from 'class-validator'
import { ConversationType } from '@prisma/client'

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500) // MVP limit for group members
  @IsString({ each: true })
  participantIds: string[]
}