import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class ReportUserDto {
  @IsUUID()
  userId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ReportUserByUsernameDto {
  @IsString()
  username: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UserReportResponse {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description?: string | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
  reported: {
    id: string;
    username: string;
    name: string;
    avatarUrl?: string | null;
  };
}