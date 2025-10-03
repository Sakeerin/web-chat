import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { FileType } from './presigned-url.dto';

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ScanStatus {
  PENDING = 'pending',
  SCANNING = 'scanning',
  CLEAN = 'clean',
  INFECTED = 'infected',
  ERROR = 'error',
}

export class ProcessFileDto {
  @IsString()
  objectKey: string;

  @IsEnum(FileType)
  fileType: FileType;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  messageId?: string;
}

export class FileProcessingResult {
  objectKey: string;
  status: ProcessingStatus;
  publicUrl: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  metadata: FileMetadata;
  scanResult: FileScanResult;
  processedAt: Date;
}

export class FileMetadata {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationMs?: number;
  bitrate?: number;
  format?: string;
  codec?: string;
}

export class FileScanResult {
  status: ScanStatus;
  scannedAt: Date;
  threats?: string[];
  scanEngine: string;
  scanVersion?: string;
}

export class ThumbnailOptions {
  @IsOptional()
  @IsInt()
  @Min(50)
  width?: number = 200;

  @IsOptional()
  @IsInt()
  @Min(50)
  height?: number = 200;

  @IsOptional()
  @IsString()
  format?: 'jpeg' | 'png' | 'webp' = 'webp';

  @IsOptional()
  @IsInt()
  @Min(1)
  quality?: number = 80;
}

export class VideoPreviewOptions {
  @IsOptional()
  @IsInt()
  @Min(1)
  timestampSeconds?: number = 5;

  @IsOptional()
  @IsInt()
  @Min(50)
  width?: number = 320;

  @IsOptional()
  @IsInt()
  @Min(50)
  height?: number = 240;

  @IsOptional()
  @IsString()
  format?: 'jpeg' | 'png' | 'webp' = 'jpeg';
}

export class OptimizationOptions {
  @IsOptional()
  @IsBoolean()
  compressImages?: boolean = true;

  @IsOptional()
  @IsBoolean()
  convertToWebP?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  imageQuality?: number = 85;

  @IsOptional()
  @IsBoolean()
  generateThumbnails?: boolean = true;

  @IsOptional()
  @IsBoolean()
  generatePreviews?: boolean = true;
}

// Re-export FileType for convenience
export { FileType } from './presigned-url.dto';