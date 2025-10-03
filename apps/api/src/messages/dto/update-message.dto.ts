import { IsString, MaxLength } from 'class-validator'

export class UpdateMessageDto {
  @IsString()
  @MaxLength(10000) // 10KB text limit
  content: string
}