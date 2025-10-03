import { IsString, IsEnum, IsOptional } from 'class-validator'
import { ConversationMemberRole } from '@prisma/client'

export class AddMemberDto {
  @IsString()
  userId: string

  @IsOptional()
  @IsEnum(ConversationMemberRole)
  role?: ConversationMemberRole = ConversationMemberRole.MEMBER
}