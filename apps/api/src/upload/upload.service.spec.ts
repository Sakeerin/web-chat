import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { PrismaService } from '../database/prisma.service';
import { MediaProcessingService, AntivirusService, S3Service } from './services';
import {
  FileType,
  ProcessingStatus,
  ScanStatus,
  GeneratePresignedUrlDto,
  UploadAvatarDto,
  ProcessFileDto,
} from './dto';

describe('UploadService', () => {
  let service: UploadService;
  let prismaService: jest.Mocked<PrismaService>;
  let mediaProcessingService: jest.Mocked<MediaProcessingService>;
  let antivirusService: jest.Mocked<AntivirusService>;
  let s3Service: jest.Mocked<S3Service>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const mockMediaProcessingService = {
      extractMetadata: jest.fn(),
      validateFileContent: jest.fn(),
      generateImageThumbnail: jest.fn(),
      generateVideoPreview: jest.fn(),
      createTempFilePath: jest.fn(),
      cleanupTempFiles: jest.fn(),
    };

    const mockAntivirusService = {
      initialize: jest.fn(),
      scanFile: jest.fn(),
      healthCheck: jest.fn(),
    };

    const mockS3Service = {
      generateObjectKey: jest.fn(),
      generatePresignedUploadUrl: jest.fn(),
      getPublicUrl: jest.fn(),
      fileExists: jest.fn(),
      getFileMetadata: jest.fn(),
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      healthCheck: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MediaProcessingService, useValue: mockMediaProcessingService },
        { provide: AntivirusService, useValue: mockAntivirusService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    prismaService = module.get(PrismaService);
    mediaProcessingService = module.get(MediaProcessingService);
    antivirusService = module.get(AntivirusService);
    s3Service = module.get(S3Service);
    configService = module.get(ConfigService);

    // Setup default mock returns
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'TEMP_DIR':
          return '/tmp/uploads';
        default:
          return undefined;
      }
    });
  });

  describe('generateAvatarUploadUrl', () => {
    it('should generate presigned URL for valid avatar upload', async () => {
      const uploadData: UploadAvatarDto = {
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 1024, // 1MB
      };

      const mockObjectKey = 'avatars/user-123/1234567890_abcd.jpg';
      const mockUploadUrl = 'https://s3.amazonaws.com/presigned-url';
      const mockAvatarUrl = 'https://cdn.example.com/avatars/user-123/1234567890_abcd.jpg';

      s3Service.generateObjectKey.mockReturnValue(mockObjectKey);
      s3Service.generatePresignedUploadUrl.mockResolvedValue(mockUploadUrl);
      s3Service.getPublicUrl.mockReturnValue(mockAvatarUrl);

      const result = await service.generateAvatarUploadUrl(mockUser.id, uploadData);

      expect(result).toEqual({
        uploadUrl: mockUploadUrl,
        objectKey: mockObjectKey,
        avatarUrl: mockAvatarUrl,
        expiresIn: 3600,
      });

      expect(s3Service.generateObjectKey).toHaveBeenCalledWith(
        FileType.AVATAR,
        mockUser.id,
        '.jpg',
      );
      expect(s3Service.generatePresignedUploadUrl).toHaveBeenCalledWith(
        mockObjectKey,
        'image/jpeg',
        3600,
      );
    });

    it('should reject invalid avatar file type', async () => {
      const uploadData: UploadAvatarDto = {
        fileName: 'avatar.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 1024,
      };

      await expect(
        service.generateAvatarUploadUrl(mockUser.id, uploadData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject oversized avatar file', async () => {
      const uploadData: UploadAvatarDto = {
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileSize: 10 * 1024 * 1024, // 10MB (over 5MB limit)
      };

      await expect(
        service.generateAvatarUploadUrl(mockUser.id, uploadData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generatePresignedUrl', () => {
    it('should generate presigned URL for valid file upload', async () => {
      const uploadData: GeneratePresignedUrlDto = {
        fileType: FileType.IMAGE,
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2 * 1024 * 1024, // 2MB
      };

      const mockObjectKey = 'images/uuid-123/1234567890_abcd.jpg';
      const mockUploadUrl = 'https://s3.amazonaws.com/presigned-url';
      const mockPublicUrl = 'https://cdn.example.com/images/uuid-123/1234567890_abcd.jpg';

      s3Service.generateObjectKey.mockReturnValue(mockObjectKey);
      s3Service.generatePresignedUploadUrl.mockResolvedValue(mockUploadUrl);
      s3Service.getPublicUrl.mockReturnValue(mockPublicUrl);

      const result = await service.generatePresignedUrl(uploadData);

      expect(result).toEqual({
        uploadUrl: mockUploadUrl,
        objectKey: mockObjectKey,
        publicUrl: mockPublicUrl,
        expiresIn: 3600,
      });
    });

    it('should reject unsupported file type', async () => {
      const uploadData: GeneratePresignedUrlDto = {
        fileType: FileType.IMAGE,
        fileName: 'file.exe',
        mimeType: 'application/x-executable',
        fileSize: 1024 * 1024,
      };

      await expect(service.generatePresignedUrl(uploadData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject oversized file', async () => {
      const uploadData: GeneratePresignedUrlDto = {
        fileType: FileType.VIDEO,
        fileName: 'video.mp4',
        mimeType: 'video/mp4',
        fileSize: 100 * 1024 * 1024, // 100MB (over 50MB limit)
      };

      await expect(service.generatePresignedUrl(uploadData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processFile', () => {
    const mockProcessData: ProcessFileDto = {
      objectKey: 'images/test/file.jpg',
      fileType: FileType.IMAGE,
    };

    it('should successfully process a clean file', async () => {
      const mockMetadata = {
        fileName: 'file.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024 * 1024,
        width: 800,
        height: 600,
      };

      const mockScanResult = {
        status: ScanStatus.CLEAN,
        scannedAt: new Date(),
        scanEngine: 'ClamAV',
      };

      s3Service.fileExists.mockResolvedValue(true);
      s3Service.getFileMetadata.mockResolvedValue({
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024,
        lastModified: new Date(),
        metadata: {},
      });
      s3Service.downloadFile.mockResolvedValue(undefined);
      s3Service.uploadFile.mockResolvedValue('https://cdn.example.com/thumbnail.webp');
      
      mediaProcessingService.createTempFilePath.mockReturnValue('/tmp/temp-file.jpg');
      mediaProcessingService.extractMetadata.mockResolvedValue(mockMetadata);
      mediaProcessingService.validateFileContent.mockResolvedValue(true);
      mediaProcessingService.generateImageThumbnail.mockResolvedValue(undefined);
      mediaProcessingService.cleanupTempFiles.mockResolvedValue(undefined);
      
      antivirusService.scanFile.mockResolvedValue(mockScanResult);

      const result = await service.processFile(mockProcessData);

      expect(result.status).toBe(ProcessingStatus.COMPLETED);
      expect(result.metadata).toEqual(mockMetadata);
      expect(result.scanResult).toEqual(mockScanResult);
      expect(result.thumbnailUrl).toBeDefined();
    });

    it('should reject infected files', async () => {
      const mockScanResult = {
        status: ScanStatus.INFECTED,
        scannedAt: new Date(),
        scanEngine: 'ClamAV',
        threats: ['Trojan.Generic'],
      };

      s3Service.fileExists.mockResolvedValue(true);
      s3Service.getFileMetadata.mockResolvedValue({
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024,
        lastModified: new Date(),
        metadata: {},
      });
      s3Service.downloadFile.mockResolvedValue(undefined);
      s3Service.deleteFile.mockResolvedValue(undefined);
      
      mediaProcessingService.createTempFilePath.mockReturnValue('/tmp/temp-file.jpg');
      mediaProcessingService.extractMetadata.mockResolvedValue({
        fileName: 'file.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024 * 1024,
      });
      mediaProcessingService.validateFileContent.mockResolvedValue(true);
      mediaProcessingService.cleanupTempFiles.mockResolvedValue(undefined);
      
      antivirusService.scanFile.mockResolvedValue(mockScanResult);

      await expect(service.processFile(mockProcessData)).rejects.toThrow(
        BadRequestException,
      );

      expect(s3Service.deleteFile).toHaveBeenCalledWith(mockProcessData.objectKey);
    });

    it('should reject files with invalid content', async () => {
      s3Service.fileExists.mockResolvedValue(true);
      s3Service.getFileMetadata.mockResolvedValue({
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024,
        lastModified: new Date(),
        metadata: {},
      });
      s3Service.downloadFile.mockResolvedValue(undefined);
      
      mediaProcessingService.createTempFilePath.mockReturnValue('/tmp/temp-file.jpg');
      mediaProcessingService.extractMetadata.mockResolvedValue({
        fileName: 'file.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024 * 1024,
      });
      mediaProcessingService.validateFileContent.mockResolvedValue(false);
      mediaProcessingService.cleanupTempFiles.mockResolvedValue(undefined);

      await expect(service.processFile(mockProcessData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle file not found', async () => {
      s3Service.fileExists.mockResolvedValue(false);

      await expect(service.processFile(mockProcessData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processAvatar', () => {
    it('should successfully process avatar and update user', async () => {
      const objectKey = 'avatars/user-123/avatar.jpg';
      const mockAvatarUrl = 'https://cdn.example.com/avatars/user-123/avatar.jpg';

      // Mock the processFile method
      jest.spyOn(service, 'processFile').mockResolvedValue({
        objectKey,
        status: ProcessingStatus.COMPLETED,
        publicUrl: mockAvatarUrl,
        metadata: {
          fileName: 'avatar.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 1024,
        },
        scanResult: {
          status: ScanStatus.CLEAN,
          scannedAt: new Date(),
          scanEngine: 'ClamAV',
        },
        processedAt: new Date(),
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        avatarUrl: mockAvatarUrl,
      });

      const result = await service.processAvatar(objectKey, mockUser.id);

      expect(result).toBe(mockAvatarUrl);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { avatarUrl: mockAvatarUrl },
      });
    });

    it('should handle processing failure', async () => {
      const objectKey = 'avatars/user-123/avatar.jpg';

      jest.spyOn(service, 'processFile').mockResolvedValue({
        objectKey,
        status: ProcessingStatus.FAILED,
        publicUrl: 'https://cdn.example.com/avatars/user-123/avatar.jpg',
        metadata: {
          fileName: 'avatar.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 1024,
        },
        scanResult: {
          status: ScanStatus.ERROR,
          scannedAt: new Date(),
          scanEngine: 'ClamAV',
        },
        processedAt: new Date(),
      });

      await expect(service.processAvatar(objectKey, mockUser.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail for image', async () => {
      const objectKey = 'images/test/photo.jpg';
      const thumbnailUrl = 'https://cdn.example.com/images/test/photo_thumb.webp';

      s3Service.downloadFile.mockResolvedValue(undefined);
      s3Service.uploadFile.mockResolvedValue(thumbnailUrl);
      
      mediaProcessingService.createTempFilePath
        .mockReturnValueOnce('/tmp/original.jpg')
        .mockReturnValueOnce('/tmp/thumbnail.webp');
      mediaProcessingService.generateImageThumbnail.mockResolvedValue(undefined);
      mediaProcessingService.cleanupTempFiles.mockResolvedValue(undefined);

      const result = await service.generateThumbnail(objectKey);

      expect(result).toBe(thumbnailUrl);
      expect(mediaProcessingService.generateImageThumbnail).toHaveBeenCalled();
    });
  });

  describe('generateVideoPreview', () => {
    it('should generate preview for video', async () => {
      const objectKey = 'videos/test/movie.mp4';
      const previewUrl = 'https://cdn.example.com/videos/test/movie_preview.jpeg';

      s3Service.downloadFile.mockResolvedValue(undefined);
      s3Service.uploadFile.mockResolvedValue(previewUrl);
      
      mediaProcessingService.createTempFilePath
        .mockReturnValueOnce('/tmp/original.mp4')
        .mockReturnValueOnce('/tmp/preview.jpeg');
      mediaProcessingService.generateVideoPreview.mockResolvedValue(undefined);
      mediaProcessingService.cleanupTempFiles.mockResolvedValue(undefined);

      const result = await service.generateVideoPreview(objectKey);

      expect(result).toBe(previewUrl);
      expect(mediaProcessingService.generateVideoPreview).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file and associated assets', async () => {
      const objectKey = 'images/test/photo.jpg';

      s3Service.deleteFile.mockResolvedValue(undefined);

      await service.deleteFile(objectKey);

      expect(s3Service.deleteFile).toHaveBeenCalledWith(objectKey);
      // Should also attempt to delete thumbnail and preview
      expect(s3Service.deleteFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('healthCheck', () => {
    it('should return health status of all services', async () => {
      s3Service.healthCheck.mockResolvedValue(true);
      antivirusService.healthCheck.mockResolvedValue(true);

      const result = await service.healthCheck();

      expect(result).toEqual({
        s3: true,
        antivirus: true,
        mediaProcessing: true,
      });
    });

    it('should handle service failures gracefully', async () => {
      s3Service.healthCheck.mockRejectedValue(new Error('S3 connection failed'));
      antivirusService.healthCheck.mockResolvedValue(false);

      const result = await service.healthCheck();

      expect(result).toEqual({
        s3: false,
        antivirus: false,
        mediaProcessing: true,
      });
    });
  });
});