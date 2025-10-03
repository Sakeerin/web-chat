import { IsString, IsOptional } from 'class-validator'

export class LogoutDto {
  @IsString()
  @IsOptional()
  sessionId?: string
}