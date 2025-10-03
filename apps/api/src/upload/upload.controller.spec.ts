import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import {
  FileType,
  ProcessingStatus,
  ScanStatus,
  GeneratePresignedUrlDto,
  UploadAvatarDto,
  ProcessFileDto,
  ThumbnailOptions,
  VideoPreviewOptions,
} from './dto';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: jest.Mocked<UploadService>;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    const mockUploadService = {
      generateAvatarUploadUrl: jest.fn(),
      generatePresignedUrl: jest.fn(),
      processFile: jest.fn(),
      processAvatar: jest.fn(),
      generateThumbnail: jest.fn(),
      generateVideoPreview: jest.fn(),
      deleteFile: jest.fn(),
      healthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    uploadService = module.get(UploadService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateAvatarUploadUrl', () => {
    it('should generate avatar upload URL', async () => {
      const uploadData: UploadAvatarDto = {
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 1024,
      };

      const expectedResult = {
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        objectKey: 'avatars/user-123/avatar.jpg',
        avatarUrl: 'https://cdn.example.com/avatars/user-123/avatar.jpg',
        expiresIn: 3600,
      };

      uploadService.generateAvatarUploadUrl.mockResolvedValue(expectedResult);

      const result = await controller.generateAvatarUploadUrl(mockRequest, uploadData);

      expect(result).toEqual(expectedResult);
      expect(uploadService.generateAvatarUploadUrl).toHaveBeenCalledWith(
        mockUser.id,
        uploadData,
      );
    });

    it('should handle avatar upload URL generation errors', async () => {
      const uploadData: UploadAvatarDto = {
        fileName: 'invalid.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 1024,
      };

      uploadService.generateAvatarUploadUrl.mockRejectedValue(
        new BadRequestException('Invalid file type'),
      );

      await expect(
        controller.generateAvatarUploadUrl(mockRequest, uploadData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generatePresignedUrl', () => {
    it('should generate presigned URL for file upload', async () => {
      const uploadData: GeneratePresignedUrlDto = {
        fileType: FileType.IMAGE,
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2 * 1024 * 1024,
      };

      const expectedResult = {
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        objectKey: 'images/uuid/photo.jpg',
        publicUrl: 'https://cdn.example.com/images/uuid/photo.jpg',
        expiresIn: 3600,
      };

      uploadService.generatePresignedUrl.mockResolvedValue(expectedResult);

      const result = await controller.generatePresignedUrl(uploadData);

      expect(result).toEqual(expectedResult);
      expect(uploadService.generatePresignedUrl).toHaveBeenCalledWith(uploadData);
    });

    it('should handle presigned URL generation errors', async () => {
      const uploadData: GeneratePresignedUrlDto = {
        fileType: FileType.VIDEO,
        fileName: 'huge-video.mp4',
        mimeType: 'video/mp4',
        fileSize: 100 * 1024 * 1024, // Over limit
      };

      uploadService.generatePresignedUrl.mockRejectedValue(
        new BadRequestException('File size too large'),
      );

      await expect(controller.generatePresignedUrl(uploadData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processFile', () => {
    it('should process uploaded file successfully', async () => {
      const processData: ProcessFileDto = {
        objectKey: 'images/test/file.jpg',
        fileType: FileType.IMAGE,
      };

      const expectedResult = {
        objectKey: 'images/test/file.jpg',
        status: ProcessingStatus.COMPLETED,
        publicUrl: 'https://cdn.example.com/images/test/file.jpg',
        thumbnailUrl: 'https://cdn.example.com/images/test/file_thumb.webp',
        metadata: {
          fileName: 'file.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 1024,
          width: 800,
          height: 600,
        },
        scanResult: {
          status: ScanStatus.CLEAN,
          scannedAt: new Date(),
          scanEngine: 'ClamAV',
        },
        processedAt: new Date(),
      };

      uploadService.processFile.mockResolvedValue(expectedResult);

      const result = await controller.processFile(processData);

      expect(result).toEqual(expectedResult);
      expect(uploadService.processFile).toHaveBeenCalledWith(processData);
    });

    it('should handle file processing errors', async () => {
      const processData: ProcessFileDto = {
        objectKey: 'images/test/infected.jpg',
        fileType: FileType.IMAGE,
      };

      uploadService.processFile.mockRejectedValue(
        new BadRequestException('File contains malware'),
      );

      await expect(controller.processFile(processData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processAvatar', () => {
    it('should process avatar successfully', async () => {
      const body = { objectKey: 'avatars/user-123/avatar.jpg' };
      const expectedAvatarUrl = 'https://cdn.example.com/avatars/user-123/avatar.jpg';

      uploadService.processAvatar.mockResolvedValue(expectedAvatarUrl);

      const result = await controller.processAvatar(mockRequest, body);

      expect(result).toEqual({ avatarUrl: expectedAvatarUrl });
      expect(uploadService.processAvatar).toHaveBeenCalledWith(
        body.objectKey,
        mockUser.id,
      );
    });

    it('should handle avatar processing errors', async () => {
      const body = { objectKey: 'avatars/user-123/invalid.jpg' };

      uploadService.processAvatar.mockRejectedValue(
        new InternalServerErrorException('Processing failed'),
      );

      await expect(controller.processAvatar(mockRequest, body)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail for image', async () => {
      const objectKey = 'images%2Ftest%2Fphoto.jpg'; // URL encoded
      const options: ThumbnailOptions = {
        width: 300,
        height: 300,
        format: 'webp',
        quality: 85,
      };
      const expectedThumbnailUrl = 'https://cdn.example.com/images/test/photo_thumb.webp';

      uploadService.generateThumbnail.mockResolvedValue(expectedThumbnailUrl);

      const result = await controller.generateThumbnail(objectKey, options);

      expect(result).toEqual({ thumbnailUrl: expectedThumbnailUrl });
      expect(uploadService.generateThumbnail).toHaveBeenCalledWith(
        'images/test/photo.jpg', // Decoded
        options,
      );
    });

    it('should handle thumbnail generation errors', async () => {
      const objectKey = 'images%2Ftest%2Finvalid.jpg';
      const options: ThumbnailOptions = {};

      uploadService.generateThumbnail.mockRejectedValue(
        new InternalServerErrorException('Thumbnail generation failed'),
      );

      await expect(controller.generateThumbnail(objectKey, options)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('generateVideoPreview', () => {
    it('should generate video preview', async () => {
      const objectKey = 'videos%2Ftest%2Fmovie.mp4'; // URL encoded
      const options: VideoPreviewOptions = {
        timestampSeconds: 10,
        width: 640,
        height: 480,
        format: 'jpeg',
      };
      const expectedPreviewUrl = 'https://cdn.example.com/videos/test/movie_preview.jpeg';

      uploadService.generateVideoPreview.mockResolvedValue(expectedPreviewUrl);

      const result = await controller.generateVideoPreview(objectKey, options);

      expect(result).toEqual({ previewUrl: expectedPreviewUrl });
      expect(uploadService.generateVideoPreview).toHaveBeenCalledWith(
        'videos/test/movie.mp4', // Decoded
        options,
      );
    });

    it('should handle video preview generation errors', async () => {
      const objectKey = 'videos%2Ftest%2Finvalid.mp4';
      const options: VideoPreviewOptions = {};

      uploadService.generateVideoPreview.mockRejectedValue(
        new InternalServerErrorException('Video preview generation failed'),
      );

      await expect(controller.generateVideoPreview(objectKey, options)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const objectKey = 'images%2Ftest%2Ffile.jpg'; // URL encoded

      uploadService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile(objectKey);

      expect(uploadService.deleteFile).toHaveBeenCalledWith('images/test/file.jpg'); // Decoded
    });

    it('should handle file deletion errors', async () => {
      const objectKey = 'images%2Ftest%2Fnonexistent.jpg';

      uploadService.deleteFile.mockRejectedValue(
        new InternalServerErrorException('File deletion failed'),
      );

      await expect(controller.deleteFile(objectKey)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const expectedHealth = {
        s3: true,
        antivirus: true,
        mediaProcessing: true,
      };

      uploadService.healthCheck.mockResolvedValue(expectedHealth);

      const result = await controller.healthCheck();

      expect(result).toEqual(expectedHealth);
      expect(uploadService.healthCheck).toHaveBeenCalled();
    });

    it('should handle health check errors', async () => {
      const expectedHealth = {
        s3: false,
        antivirus: false,
        mediaProcessing: true,
      };

      uploadService.healthCheck.mockResolvedValue(expectedHealth);

      const result = await controller.healthCheck();

      expect(result).toEqual(expectedHealth);
    });
  });
});