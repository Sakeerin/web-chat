import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import {
  FileMetadata,
  ThumbnailOptions,
  VideoPreviewOptions,
  OptimizationOptions,
  FileType,
} from '../dto';

// Configure ffmpeg paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
ffmpeg.setFfprobePath(ffprobeStatic.path);

@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(MediaProcessingService.name);
  private readonly tempDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tempDir = this.configService.get<string>('TEMP_DIR') || '/tmp/uploads';
  }

  /**
   * Extract metadata from uploaded file
   */
  async extractMetadata(filePath: string, mimeType: string): Promise<FileMetadata> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);

      const baseMetadata: FileMetadata = {
        fileName,
        mimeType,
        sizeBytes: stats.size,
      };

      if (mimeType.startsWith('image/')) {
        return await this.extractImageMetadata(filePath, baseMetadata);
      } else if (mimeType.startsWith('video/')) {
        return await this.extractVideoMetadata(filePath, baseMetadata);
      } else if (mimeType.startsWith('audio/')) {
        return await this.extractAudioMetadata(filePath, baseMetadata);
      }

      return baseMetadata;
    } catch (error) {
      this.logger.error(`Failed to extract metadata: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to extract file metadata');
    }
  }

  /**
   * Generate thumbnail for image files
   */
  async generateImageThumbnail(
    inputPath: string,
    outputPath: string,
    options: ThumbnailOptions = {},
  ): Promise<void> {
    try {
      const { width = 200, height = 200, format = 'webp', quality = 80 } = options;

      await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .toFormat(format as any, { quality })
        .toFile(outputPath);

      this.logger.log(`Generated image thumbnail: ${outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to generate image thumbnail: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate image thumbnail');
    }
  }

  /**
   * Generate video preview/thumbnail
   */
  async generateVideoPreview(
    inputPath: string,
    outputPath: string,
    options: VideoPreviewOptions = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const { timestampSeconds = 5, width = 320, height = 240, format = 'jpeg' } = options;

      ffmpeg(inputPath)
        .seekInput(timestampSeconds)
        .frames(1)
        .size(`${width}x${height}`)
        .format(format)
        .output(outputPath)
        .on('end', () => {
          this.logger.log(`Generated video preview: ${outputPath}`);
          resolve();
        })
        .on('error', (error) => {
          this.logger.error(`Failed to generate video preview: ${error.message}`, error.stack);
          reject(new InternalServerErrorException('Failed to generate video preview'));
        })
        .run();
    });
  }

  /**
   * Optimize image files
   */
  async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: OptimizationOptions = {},
  ): Promise<void> {
    try {
      const { imageQuality = 85, convertToWebP = true } = options;

      let pipeline = sharp(inputPath);

      if (convertToWebP) {
        pipeline = pipeline.webp({ quality: imageQuality });
      } else {
        pipeline = pipeline.jpeg({ quality: imageQuality });
      }

      await pipeline.toFile(outputPath);

      this.logger.log(`Optimized image: ${outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to optimize image: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to optimize image');
    }
  }

  /**
   * Process video file (extract metadata, generate preview)
   */
  async processVideo(
    inputPath: string,
    outputDir: string,
    options: OptimizationOptions = {},
  ): Promise<{ previewPath?: string; metadata: Partial<FileMetadata> }> {
    try {
      const metadata = await this.extractVideoMetadata(inputPath, {
        fileName: path.basename(inputPath),
        mimeType: 'video/*',
        sizeBytes: 0,
      });

      let previewPath: string | undefined;

      if (options.generatePreviews) {
        const previewFileName = `${crypto.randomUUID()}_preview.jpeg`;
        previewPath = path.join(outputDir, previewFileName);
        await this.generateVideoPreview(inputPath, previewPath);
      }

      return { previewPath, metadata };
    } catch (error) {
      this.logger.error(`Failed to process video: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to process video');
    }
  }

  /**
   * Validate file content (basic checks)
   */
  async validateFileContent(filePath: string, expectedMimeType: string): Promise<boolean> {
    try {
      if (expectedMimeType.startsWith('image/')) {
        return await this.validateImageFile(filePath);
      } else if (expectedMimeType.startsWith('video/')) {
        return await this.validateVideoFile(filePath);
      } else if (expectedMimeType.startsWith('audio/')) {
        return await this.validateAudioFile(filePath);
      }

      // For other file types, just check if file exists and is readable
      await fs.access(filePath, fs.constants.R_OK);
      return true;
    } catch (error) {
      this.logger.warn(`File validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create temporary file path
   */
  createTempFilePath(extension: string): string {
    const fileName = `${crypto.randomUUID()}${extension}`;
    return path.join(this.tempDir, fileName);
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(filePaths: string[]): Promise<void> {
    await Promise.allSettled(
      filePaths.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
          this.logger.log(`Cleaned up temp file: ${filePath}`);
        } catch (error) {
          this.logger.warn(`Failed to cleanup temp file ${filePath}: ${error.message}`);
        }
      }),
    );
  }

  // Private helper methods

  private async extractImageMetadata(
    filePath: string,
    baseMetadata: FileMetadata,
  ): Promise<FileMetadata> {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        ...baseMetadata,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    } catch (error) {
      this.logger.warn(`Failed to extract image metadata: ${error.message}`);
      return baseMetadata;
    }
  }

  private async extractVideoMetadata(
    filePath: string,
    baseMetadata: FileMetadata,
  ): Promise<FileMetadata> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) {
          this.logger.warn(`Failed to extract video metadata: ${error.message}`);
          resolve(baseMetadata);
          return;
        }

        const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video');
        const audioStream = metadata.streams.find((stream) => stream.codec_type === 'audio');

        resolve({
          ...baseMetadata,
          width: videoStream?.width,
          height: videoStream?.height,
          durationMs: metadata.format.duration ? Math.round(metadata.format.duration * 1000) : undefined,
          bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate.toString()) : undefined,
          format: metadata.format.format_name,
          codec: videoStream?.codec_name || audioStream?.codec_name,
        });
      });
    });
  }

  private async extractAudioMetadata(
    filePath: string,
    baseMetadata: FileMetadata,
  ): Promise<FileMetadata> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) {
          this.logger.warn(`Failed to extract audio metadata: ${error.message}`);
          resolve(baseMetadata);
          return;
        }

        const audioStream = metadata.streams.find((stream) => stream.codec_type === 'audio');

        resolve({
          ...baseMetadata,
          durationMs: metadata.format.duration ? Math.round(metadata.format.duration * 1000) : undefined,
          bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate.toString()) : undefined,
          format: metadata.format.format_name,
          codec: audioStream?.codec_name,
        });
      });
    });
  }

  private async validateImageFile(filePath: string): Promise<boolean> {
    try {
      await sharp(filePath).metadata();
      return true;
    } catch {
      return false;
    }
  }

  private async validateVideoFile(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) {
          resolve(false);
          return;
        }
        
        const hasVideoStream = metadata.streams.some((stream) => stream.codec_type === 'video');
        resolve(hasVideoStream);
      });
    });
  }

  private async validateAudioFile(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) {
          resolve(false);
          return;
        }
        
        const hasAudioStream = metadata.streams.some((stream) => stream.codec_type === 'audio');
        resolve(hasAudioStream);
      });
    });
  }
}