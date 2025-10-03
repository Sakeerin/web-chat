import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'
import { ConversationType } from '@prisma/client'

export class ConversationQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeArchived?: boolean = false

  @IsOptional()
  @IsString()
  search?: string
}