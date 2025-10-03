import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UploadAvatarDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024) // 5MB max
  fileSize: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;
}

export interface AvatarUploadResult {
  uploadUrl: string;
  objectKey: string;
  avatarUrl: string;
  expiresIn: number;
}