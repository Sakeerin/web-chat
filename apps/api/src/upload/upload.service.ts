import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import {
  UploadAvatarDto,
  AvatarUploadResult,
  GeneratePresignedUrlDto,
  PresignedUrlResult,
  FileType,
  ProcessFileDto,
  FileProcessingResult,
  ProcessingStatus,
  ScanStatus,
  ThumbnailOptions,
  VideoPreviewOptions,
  OptimizationOptions,
} from './dto';
import { MediaProcessingService, AntivirusService, S3Service } from './services';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as mimeTypes from 'mime-types';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private readonly maxFileSizes = {
    [FileType.AVATAR]: 5 * 1024 * 1024, // 5MB
    [FileType.IMAGE]: 10 * 1024 * 1024, // 10MB
    [FileType.VIDEO]: 50 * 1024 * 1024, // 50MB
    [FileType.AUDIO]: 20 * 1024 * 1024, // 20MB
    [FileType.DOCUMENT]: 25 * 1024 * 1024, // 25MB
  };

  private readonly allowedMimeTypes = {
    [FileType.AVATAR]: ['image/jpeg', 'image/png', 'image/webp'],
    [FileType.IMAGE]: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
    [FileType.VIDEO]: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
    [FileType.AUDIO]: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a'],
    [FileType.DOCUMENT]: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mediaProcessingService: MediaProcessingService,
    private readonly antivirusService: AntivirusService,
    private readonly s3Service: S3Service,
  ) {}

  async onModuleInit() {
    // Initialize antivirus service
    await this.antivirusService.initialize();
    
    // Ensure temp directory exists
    const tempDir = this.configService.get<string>('TEMP_DIR') || '/tmp/uploads';
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      this.logger.warn(`Failed to create temp directory: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for avatar upload
   */
  async generateAvatarUploadUrl(
    userId: string,
    uploadData: UploadAvatarDto,
  ): Promise<AvatarUploadResult> {
    // Validate file type
    if (!this.allowedMimeTypes[FileType.AVATAR].includes(uploadData.mimeType)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed for avatars.',
      );
    }

    // Validate file size
    if (uploadData.fileSize > this.maxFileSizes[FileType.AVATAR]) {
      throw new BadRequestException(
        `File size too large. Maximum size is ${this.maxFileSizes[FileType.AVATAR] / (1024 * 1024)}MB.`,
      );
    }

    // Generate unique object key
    const fileExtension = this.getFileExtension(uploadData.fileName);
    const objectKey = this.s3Service.generateObjectKey(FileType.AVATAR, userId, fileExtension);

    // Generate presigned URL
    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      objectKey,
      uploadData.mimeType,
      3600, // 1 hour
    );
    
    const avatarUrl = this.s3Service.getPublicUrl(objectKey);

    return {
      uploadUrl,
      objectKey,
      avatarUrl,
      expiresIn: 3600,
    };
  }

  /**
   * Generate presigned URL for general file uploads
   */
  async generatePresignedUrl(
    uploadData: GeneratePresignedUrlDto,
  ): Promise<PresignedUrlResult> {
    // Validate file type and size
    this.validateFileUpload(uploadData);

    // Generate unique object key
    const fileExtension = this.getFileExtension(uploadData.fileName);
    const objectKey = this.s3Service.generateObjectKey(
      uploadData.fileType,
      crypto.randomUUID(),
      fileExtension,
    );

    // Generate presigned URL
    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      objectKey,
      uploadData.mimeType,
      3600, // 1 hour
    );
    
    const publicUrl = this.s3Service.getPublicUrl(objectKey);

    return {
      uploadUrl,
      objectKey,
      publicUrl,
      expiresIn: 3600,
    };
  }

  /**
   * Process uploaded file (scan, validate, generate thumbnails/previews)
   */
  async processFile(processData: ProcessFileDto): Promise<FileProcessingResult> {
    const { objectKey, fileType } = processData;
    
    this.logger.log(`Starting file processing for: ${objectKey}`);

    const result: FileProcessingResult = {
      objectKey,
      status: ProcessingStatus.PROCESSING,
      publicUrl: this.s3Service.getPublicUrl(objectKey),
      metadata: {
        fileName: '',
        mimeType: '',
        sizeBytes: 0,
      },
      scanResult: {
        status: ScanStatus.PENDING,
        scannedAt: new Date(),
        scanEngine: 'ClamAV',
      },
      processedAt: new Date(),
    };

    const tempFiles: string[] = [];

    try {
      // Check if file exists in S3
      if (!(await this.s3Service.fileExists(objectKey))) {
        throw new BadRequestException('File not found in storage');
      }

      // Get file metadata from S3
      const s3Metadata = await this.s3Service.getFileMetadata(objectKey);
      
      // Download file for processing
      const tempFilePath = this.mediaProcessingService.createTempFilePath(
        path.extname(objectKey),
      );
      tempFiles.push(tempFilePath);
      
      await this.s3Service.downloadFile(objectKey, tempFilePath);

      // Extract detailed metadata
      result.metadata = await this.mediaProcessingService.extractMetadata(
        tempFilePath,
        s3Metadata.contentType,
      );

      // Validate file content
      const isValidContent = await this.mediaProcessingService.validateFileContent(
        tempFilePath,
        s3Metadata.contentType,
      );

      if (!isValidContent) {
        throw new BadRequestException('Invalid file content or corrupted file');
      }

      // Scan for viruses
      result.scanResult = await this.antivirusService.scanFile(tempFilePath);

      if (result.scanResult.status === ScanStatus.INFECTED) {
        // Delete infected file
        await this.s3Service.deleteFile(objectKey);
        throw new BadRequestException('File contains malware and has been deleted');
      }

      if (result.scanResult.status === ScanStatus.ERROR) {
        this.logger.warn(`Antivirus scan failed for ${objectKey}, proceeding with caution`);
      }

      // Generate thumbnails and previews based on file type
      await this.generateMediaAssets(tempFilePath, objectKey, fileType, result);

      result.status = ProcessingStatus.COMPLETED;
      this.logger.log(`File processing completed for: ${objectKey}`);

    } catch (error) {
      result.status = ProcessingStatus.FAILED;
      this.logger.error(`File processing failed for ${objectKey}: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('File processing failed');
    } finally {
      // Clean up temporary files
      await this.mediaProcessingService.cleanupTempFiles(tempFiles);
    }

    return result;
  }

  /**
   * Process uploaded avatar (resize, optimize)
   */
  async processAvatar(objectKey: string, userId: string): Promise<string> {
    try {
      const processResult = await this.processFile({
        objectKey,
        fileType: FileType.AVATAR,
      });

      if (processResult.status !== ProcessingStatus.COMPLETED) {
        throw new InternalServerErrorException('Avatar processing failed');
      }

      // Update user's avatar URL
      const avatarUrl = processResult.publicUrl;
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
      });

      return avatarUrl;
    } catch (error) {
      this.logger.error(`Avatar processing failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to process avatar upload');
    }
  }

  /**
   * Generate thumbnail for image uploads
   */
  async generateThumbnail(
    objectKey: string,
    options: ThumbnailOptions = {},
  ): Promise<string> {
    const tempFiles: string[] = [];

    try {
      // Download original file
      const tempFilePath = this.mediaProcessingService.createTempFilePath('.tmp');
      tempFiles.push(tempFilePath);
      
      await this.s3Service.downloadFile(objectKey, tempFilePath);

      // Generate thumbnail
      const thumbnailPath = this.mediaProcessingService.createTempFilePath('.webp');
      tempFiles.push(thumbnailPath);
      
      await this.mediaProcessingService.generateImageThumbnail(
        tempFilePath,
        thumbnailPath,
        options,
      );

      // Upload thumbnail to S3
      const thumbnailKey = objectKey.replace(/(\.[^.]+)$/, '_thumb.webp');
      const thumbnailUrl = await this.s3Service.uploadFile(
        thumbnailPath,
        thumbnailKey,
        'image/webp',
        { originalKey: objectKey },
      );

      return thumbnailUrl;
    } catch (error) {
      this.logger.error(`Thumbnail generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate thumbnail');
    } finally {
      await this.mediaProcessingService.cleanupTempFiles(tempFiles);
    }
  }

  /**
   * Generate video preview
   */
  async generateVideoPreview(
    objectKey: string,
    options: VideoPreviewOptions = {},
  ): Promise<string> {
    const tempFiles: string[] = [];

    try {
      // Download original video
      const tempFilePath = this.mediaProcessingService.createTempFilePath('.tmp');
      tempFiles.push(tempFilePath);
      
      await this.s3Service.downloadFile(objectKey, tempFilePath);

      // Generate video preview
      const previewPath = this.mediaProcessingService.createTempFilePath('.jpeg');
      tempFiles.push(previewPath);
      
      await this.mediaProcessingService.generateVideoPreview(
        tempFilePath,
        previewPath,
        options,
      );

      // Upload preview to S3
      const previewKey = objectKey.replace(/(\.[^.]+)$/, '_preview.jpeg');
      const previewUrl = await this.s3Service.uploadFile(
        previewPath,
        previewKey,
        'image/jpeg',
        { originalKey: objectKey },
      );

      return previewUrl;
    } catch (error) {
      this.logger.error(`Video preview generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate video preview');
    } finally {
      await this.mediaProcessingService.cleanupTempFiles(tempFiles);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(objectKey: string): Promise<void> {
    try {
      await this.s3Service.deleteFile(objectKey);
      
      // Also delete associated thumbnails and previews
      const thumbnailKey = objectKey.replace(/(\.[^.]+)$/, '_thumb.webp');
      const previewKey = objectKey.replace(/(\.[^.]+)$/, '_preview.jpeg');
      
      await Promise.allSettled([
        this.s3Service.deleteFile(thumbnailKey),
        this.s3Service.deleteFile(previewKey),
      ]);
      
      this.logger.log(`Deleted file and associated assets: ${objectKey}`);
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Health check for upload service
   */
  async healthCheck(): Promise<{
    s3: boolean;
    antivirus: boolean;
    mediaProcessing: boolean;
  }> {
    const [s3Health, antivirusHealth] = await Promise.allSettled([
      this.s3Service.healthCheck(),
      this.antivirusService.healthCheck(),
    ]);

    return {
      s3: s3Health.status === 'fulfilled' ? s3Health.value : false,
      antivirus: antivirusHealth.status === 'fulfilled' ? antivirusHealth.value : false,
      mediaProcessing: true, // Media processing is always available if the service is running
    };
  }

  // Private helper methods

  private validateFileUpload(uploadData: GeneratePresignedUrlDto): void {
    const { fileType, mimeType, fileSize } = uploadData;

    // Check if file type is supported
    if (!this.allowedMimeTypes[fileType]) {
      throw new BadRequestException('Unsupported file type');
    }

    // Validate MIME type
    if (!this.allowedMimeTypes[fileType].includes(mimeType)) {
      throw new BadRequestException(`Invalid MIME type for ${fileType} files`);
    }

    // Validate file size
    if (fileSize > this.maxFileSizes[fileType]) {
      const maxSizeMB = this.maxFileSizes[fileType] / (1024 * 1024);
      throw new BadRequestException(`File size too large. Maximum size is ${maxSizeMB}MB`);
    }

    // Additional validation for specific file types
    if (fileType === FileType.IMAGE && fileSize < 100) {
      throw new BadRequestException('Image file too small');
    }
  }

  private async generateMediaAssets(
    tempFilePath: string,
    objectKey: string,
    fileType: FileType,
    result: FileProcessingResult,
  ): Promise<void> {
    const tempFiles: string[] = [];

    try {
      if (fileType === FileType.IMAGE || fileType === FileType.AVATAR) {
        // Generate thumbnail for images
        const thumbnailPath = this.mediaProcessingService.createTempFilePath('.webp');
        tempFiles.push(thumbnailPath);
        
        await this.mediaProcessingService.generateImageThumbnail(tempFilePath, thumbnailPath);
        
        const thumbnailKey = objectKey.replace(/(\.[^.]+)$/, '_thumb.webp');
        result.thumbnailUrl = await this.s3Service.uploadFile(
          thumbnailPath,
          thumbnailKey,
          'image/webp',
          { originalKey: objectKey },
        );
      }

      if (fileType === FileType.VIDEO) {
        // Generate video preview
        const previewPath = this.mediaProcessingService.createTempFilePath('.jpeg');
        tempFiles.push(previewPath);
        
        await this.mediaProcessingService.generateVideoPreview(tempFilePath, previewPath);
        
        const previewKey = objectKey.replace(/(\.[^.]+)$/, '_preview.jpeg');
        result.previewUrl = await this.s3Service.uploadFile(
          previewPath,
          previewKey,
          'image/jpeg',
          { originalKey: objectKey },
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to generate media assets for ${objectKey}: ${error.message}`);
      // Don't fail the entire process if asset generation fails
    } finally {
      await this.mediaProcessingService.cleanupTempFiles(tempFiles);
    }
  }

  private getFileExtension(fileName: string): string {
    const ext = path.extname(fileName);
    return ext || '.bin';
  }
}