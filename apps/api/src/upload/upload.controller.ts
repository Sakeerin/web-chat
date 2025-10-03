import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import {
  UploadAvatarDto,
  GeneratePresignedUrlDto,
  ProcessFileDto,
  ThumbnailOptions,
  VideoPreviewOptions,
} from './dto';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Generate presigned URL for avatar upload
   */
  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  async generateAvatarUploadUrl(
    @Request() req: any,
    @Body() uploadData: UploadAvatarDto,
  ) {
    return this.uploadService.generateAvatarUploadUrl(req.user.id, uploadData);
  }

  /**
   * Generate presigned URL for general file uploads
   */
  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  async generatePresignedUrl(@Body() uploadData: GeneratePresignedUrlDto) {
    return this.uploadService.generatePresignedUrl(uploadData);
  }

  /**
   * Process uploaded file (scan, validate, generate thumbnails/previews)
   */
  @Post('process')
  @HttpCode(HttpStatus.OK)
  async processFile(@Body() processData: ProcessFileDto) {
    return this.uploadService.processFile(processData);
  }

  /**
   * Process uploaded avatar (called after successful upload)
   */
  @Post('avatar/process')
  @HttpCode(HttpStatus.OK)
  async processAvatar(
    @Request() req: any,
    @Body() body: { objectKey: string },
  ) {
    const avatarUrl = await this.uploadService.processAvatar(
      body.objectKey,
      req.user.id,
    );
    return { avatarUrl };
  }

  /**
   * Generate thumbnail for existing image
   */
  @Post('thumbnail/:objectKey')
  @HttpCode(HttpStatus.OK)
  async generateThumbnail(
    @Param('objectKey') objectKey: string,
    @Body() options: ThumbnailOptions,
  ) {
    // Decode the object key (it might be URL encoded)
    const decodedKey = decodeURIComponent(objectKey);
    const thumbnailUrl = await this.uploadService.generateThumbnail(decodedKey, options);
    return { thumbnailUrl };
  }

  /**
   * Generate video preview for existing video
   */
  @Post('video-preview/:objectKey')
  @HttpCode(HttpStatus.OK)
  async generateVideoPreview(
    @Param('objectKey') objectKey: string,
    @Body() options: VideoPreviewOptions,
  ) {
    // Decode the object key (it might be URL encoded)
    const decodedKey = decodeURIComponent(objectKey);
    const previewUrl = await this.uploadService.generateVideoPreview(decodedKey, options);
    return { previewUrl };
  }

  /**
   * Delete uploaded file
   */
  @Delete(':objectKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Param('objectKey') objectKey: string) {
    // Decode the object key (it might be URL encoded)
    const decodedKey = decodeURIComponent(objectKey);
    await this.uploadService.deleteFile(decodedKey);
  }

  /**
   * Health check for upload service
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return this.uploadService.healthCheck();
  }
}