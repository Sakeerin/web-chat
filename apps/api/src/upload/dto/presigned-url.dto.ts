import { IsString, IsInt, Min, Max, IsEnum } from 'class-validator';

export enum FileType {
  AVATAR = 'avatar',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export class GeneratePresignedUrlDto {
  @IsEnum(FileType)
  fileType: FileType;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024) // 50MB max
  fileSize: number;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  expiresIn: number;
}