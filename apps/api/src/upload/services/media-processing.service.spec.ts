import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { MediaProcessingService } from './media-processing.service';
import * as fs from 'fs/promises';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

// Mock external dependencies
jest.mock('fs/promises');
jest.mock('sharp');
jest.mock('fluent-ffmpeg');

describe('MediaProcessingService', () => {
  let service: MediaProcessingService;
  let configService: jest.Mocked<ConfigService>;

  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockSharp = sharp as jest.MockedFunction<typeof sharp>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaProcessingService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MediaProcessingService>(MediaProcessingService);
    configService = module.get(ConfigService);

    // Setup default config
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'TEMP_DIR':
          return '/tmp/uploads';
        default:
          return undefined;
      }
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('extractMetadata', () => {
    it('should extract metadata for image files', async () => {
      const filePath = '/tmp/test-image.jpg';
      const mimeType = 'image/jpeg';

      mockFs.stat.mockResolvedValue({
        size: 1024 * 1024,
      } as any);

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue({
          width: 800,
          height: 600,
          format: 'jpeg',
        }),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await service.extractMetadata(filePath, mimeType);

      expect(result).toEqual({
        fileName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024 * 1024,
        width: 800,
        height: 600,
        format: 'jpeg',
      });
    });

    it('should extract metadata for video files', async () => {
      const filePath = '/tmp/test-video.mp4';
      const mimeType = 'video/mp4';

      mockFs.stat.mockResolvedValue({
        size: 10 * 1024 * 1024,
      } as any);

      // Mock ffmpeg.ffprobe
      const mockFfprobe = jest.fn().mockImplementation((path, callback) => {
        callback(null, {
          streams: [
            {
              codec_type: 'video',
              width: 1920,
              height: 1080,
              codec_name: 'h264',
            },
          ],
          format: {
            duration: 120.5,
            bit_rate: '1000000',
            format_name: 'mp4',
          },
        });
      });

      (ffmpeg as any).ffprobe = mockFfprobe;

      const result = await service.extractMetadata(filePath, mimeType);

      expect(result).toEqual({
        fileName: 'test-video.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 10 * 1024 * 1024,
        width: 1920,
        height: 1080,
        durationMs: 120500,
        bitrate: 1000000,
        format: 'mp4',
        codec: 'h264',
      });
    });

    it('should handle metadata extraction errors gracefully', async () => {
      const filePath = '/tmp/test-image.jpg';
      const mimeType = 'image/jpeg';

      mockFs.stat.mockRejectedValue(new Error('File not found'));

      await expect(service.extractMetadata(filePath, mimeType)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('generateImageThumbnail', () => {
    it('should generate thumbnail with default options', async () => {
      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/thumbnail.webp';

      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await service.generateImageThumbnail(inputPath, outputPath);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(200, 200, {
        fit: 'cover',
        position: 'center',
      });
      expect(mockSharpInstance.toFormat).toHaveBeenCalledWith('webp', { quality: 80 });
      expect(mockSharpInstance.toFile).toHaveBeenCalledWith(outputPath);
    });

    it('should generate thumbnail with custom options', async () => {
      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/thumbnail.jpeg';
      const options = {
        width: 300,
        height: 300,
        format: 'jpeg' as const,
        quality: 90,
      };

      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await service.generateImageThumbnail(inputPath, outputPath, options);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(300, 300, {
        fit: 'cover',
        position: 'center',
      });
      expect(mockSharpInstance.toFormat).toHaveBeenCalledWith('jpeg', { quality: 90 });
    });

    it('should handle thumbnail generation errors', async () => {
      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/thumbnail.webp';

      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockRejectedValue(new Error('Processing failed')),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await expect(
        service.generateImageThumbnail(inputPath, outputPath),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('generateVideoPreview', () => {
    it('should generate video preview with default options', async () => {
      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/preview.jpeg';

      const mockFfmpegInstance = {
        seekInput: jest.fn().mockReturnThis(),
        frames: jest.fn().mockReturnThis(),
        size: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return mockFfmpegInstance;
        }),
        run: jest.fn(),
      };

      (ffmpeg as any).mockReturnValue(mockFfmpegInstance);

      await service.generateVideoPreview(inputPath, outputPath);

      expect(mockFfmpegInstance.seekInput).toHaveBeenCalledWith(5);
      expect(mockFfmpegInstance.frames).toHaveBeenCalledWith(1);
      expect(mockFfmpegInstance.size).toHaveBeenCalledWith('320x240');
      expect(mockFfmpegInstance.format).toHaveBeenCalledWith('jpeg');
    });

    it('should handle video preview generation errors', async () => {
      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/preview.jpeg';

      const mockFfmpegInstance = {
        seekInput: jest.fn().mockReturnThis(),
        frames: jest.fn().mockReturnThis(),
        size: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('FFmpeg failed')), 0);
          }
          return mockFfmpegInstance;
        }),
        run: jest.fn(),
      };

      (ffmpeg as any).mockReturnValue(mockFfmpegInstance);

      await expect(
        service.generateVideoPreview(inputPath, outputPath),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('optimizeImage', () => {
    it('should optimize image with default options', async () => {
      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/optimized.webp';

      const mockSharpInstance = {
        webp: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await service.optimizeImage(inputPath, outputPath);

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 85 });
      expect(mockSharpInstance.toFile).toHaveBeenCalledWith(outputPath);
    });

    it('should optimize image without WebP conversion', async () => {
      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/optimized.jpg';
      const options = {
        convertToWebP: false,
        imageQuality: 75,
      };

      const mockSharpInstance = {
        jpeg: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await service.optimizeImage(inputPath, outputPath, options);

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 75 });
    });
  });

  describe('validateFileContent', () => {
    it('should validate image files', async () => {
      const filePath = '/tmp/test.jpg';
      const mimeType = 'image/jpeg';

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await service.validateFileContent(filePath, mimeType);

      expect(result).toBe(true);
    });

    it('should validate video files', async () => {
      const filePath = '/tmp/test.mp4';
      const mimeType = 'video/mp4';

      const mockFfprobe = jest.fn().mockImplementation((path, callback) => {
        callback(null, {
          streams: [
            {
              codec_type: 'video',
              width: 1920,
              height: 1080,
            },
          ],
        });
      });

      (ffmpeg as any).ffprobe = mockFfprobe;

      const result = await service.validateFileContent(filePath, mimeType);

      expect(result).toBe(true);
    });

    it('should return false for invalid files', async () => {
      const filePath = '/tmp/invalid.jpg';
      const mimeType = 'image/jpeg';

      const mockSharpInstance = {
        metadata: jest.fn().mockRejectedValue(new Error('Invalid image')),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await service.validateFileContent(filePath, mimeType);

      expect(result).toBe(false);
    });
  });

  describe('createTempFilePath', () => {
    it('should create unique temp file path', () => {
      const extension = '.jpg';
      const result = service.createTempFilePath(extension);

      expect(result).toMatch(/^\/tmp\/uploads\/[a-f0-9-]+\.jpg$/);
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up temporary files', async () => {
      const filePaths = ['/tmp/file1.jpg', '/tmp/file2.mp4'];

      mockFs.unlink.mockResolvedValue(undefined);

      await service.cleanupTempFiles(filePaths);

      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
      expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/file1.jpg');
      expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/file2.mp4');
    });

    it('should handle cleanup errors gracefully', async () => {
      const filePaths = ['/tmp/file1.jpg', '/tmp/file2.mp4'];

      mockFs.unlink
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('File not found'));

      // Should not throw
      await service.cleanupTempFiles(filePaths);

      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });
  });
});