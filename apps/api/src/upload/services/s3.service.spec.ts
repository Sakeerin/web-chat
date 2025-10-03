import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { S3Service } from './s3.service';
import { FileType } from '../dto';
import * as AWS from 'aws-sdk';
import * as fs from 'fs/promises';

// Mock AWS SDK
jest.mock('aws-sdk');
jest.mock('fs/promises');

describe('S3Service', () => {
  let service: S3Service;
  let configService: jest.Mocked<ConfigService>;
  let mockS3: any;
  let mockUpload: any;
  let mockGetObject: any;
  let mockDeleteObject: any;
  let mockHeadObject: any;
  let mockCopyObject: any;
  let mockListObjectsV2: any;

  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    // Create mock methods
    mockUpload = { promise: jest.fn() };
    mockGetObject = { promise: jest.fn() };
    mockDeleteObject = { promise: jest.fn() };
    mockHeadObject = { promise: jest.fn() };
    mockCopyObject = { promise: jest.fn() };
    mockListObjectsV2 = { promise: jest.fn() };

    // Mock S3 instance
    mockS3 = {
      getSignedUrlPromise: jest.fn(),
      upload: jest.fn().mockReturnValue(mockUpload),
      getObject: jest.fn().mockReturnValue(mockGetObject),
      deleteObject: jest.fn().mockReturnValue(mockDeleteObject),
      headObject: jest.fn().mockReturnValue(mockHeadObject),
      copyObject: jest.fn().mockReturnValue(mockCopyObject),
      listObjectsV2: jest.fn().mockReturnValue(mockListObjectsV2),
    };

    // Mock AWS.S3 constructor
    (AWS.S3 as jest.MockedClass<typeof AWS.S3>).mockImplementation(() => mockS3);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get(ConfigService);

    // Setup default config
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'S3_BUCKET_NAME':
          return 'test-bucket';
        case 'CDN_URL':
          return 'https://cdn.example.com';
        case 'AWS_REGION':
          return 'us-east-1';
        case 'AWS_ACCESS_KEY_ID':
          return 'test-access-key';
        case 'AWS_SECRET_ACCESS_KEY':
          return 'test-secret-key';
        default:
          return undefined;
      }
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generatePresignedUploadUrl', () => {
    it('should generate presigned upload URL', async () => {
      const objectKey = 'images/test/file.jpg';
      const mimeType = 'image/jpeg';
      const expiresIn = 3600;
      const expectedUrl = 'https://s3.amazonaws.com/presigned-upload-url';

      mockS3.getSignedUrlPromise.mockResolvedValue(expectedUrl);

      const result = await service.generatePresignedUploadUrl(objectKey, mimeType, expiresIn);

      expect(result).toBe(expectedUrl);
      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('putObject', {
        Bucket: 'test-bucket',
        Key: objectKey,
        Expires: expiresIn,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      });
    });

    it('should handle presigned URL generation errors', async () => {
      const objectKey = 'images/test/file.jpg';
      const mimeType = 'image/jpeg';

      mockS3.getSignedUrlPromise.mockRejectedValue(new Error('AWS error'));

      await expect(
        service.generatePresignedUploadUrl(objectKey, mimeType),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('generatePresignedDownloadUrl', () => {
    it('should generate presigned download URL', async () => {
      const objectKey = 'images/test/file.jpg';
      const expiresIn = 3600;
      const expectedUrl = 'https://s3.amazonaws.com/presigned-download-url';

      mockS3.getSignedUrlPromise.mockResolvedValue(expectedUrl);

      const result = await service.generatePresignedDownloadUrl(objectKey, expiresIn);

      expect(result).toBe(expectedUrl);
      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: 'test-bucket',
        Key: objectKey,
        Expires: expiresIn,
      });
    });
  });

  describe('uploadFile', () => {
    it('should upload file from local path', async () => {
      const localPath = '/tmp/test-file.jpg';
      const objectKey = 'images/test/file.jpg';
      const mimeType = 'image/jpeg';
      const metadata = { originalName: 'test.jpg' };
      const fileBuffer = Buffer.from('test file content');

      mockFs.readFile.mockResolvedValue(fileBuffer);
      mockUpload.promise.mockResolvedValue({
        Location: 'https://s3.amazonaws.com/test-bucket/images/test/file.jpg',
      });

      const result = await service.uploadFile(localPath, objectKey, mimeType, metadata);

      expect(result).toBe('https://cdn.example.com/test-bucket/images/test/file.jpg');
      expect(mockFs.readFile).toHaveBeenCalledWith(localPath);
      expect(mockS3.upload).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: objectKey,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: metadata,
      });
    });

    it('should handle upload errors', async () => {
      const localPath = '/tmp/test-file.jpg';
      const objectKey = 'images/test/file.jpg';
      const mimeType = 'image/jpeg';

      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(
        service.uploadFile(localPath, objectKey, mimeType),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('uploadBuffer', () => {
    it('should upload buffer to S3', async () => {
      const buffer = Buffer.from('test content');
      const objectKey = 'images/test/file.jpg';
      const mimeType = 'image/jpeg';
      const metadata = { source: 'buffer' };

      mockUpload.promise.mockResolvedValue({
        Location: 'https://s3.amazonaws.com/test-bucket/images/test/file.jpg',
      });

      const result = await service.uploadBuffer(buffer, objectKey, mimeType, metadata);

      expect(result).toBe('https://cdn.example.com/test-bucket/images/test/file.jpg');
      expect(mockS3.upload).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: metadata,
      });
    });
  });

  describe('downloadFile', () => {
    it('should download file to local path', async () => {
      const objectKey = 'images/test/file.jpg';
      const localPath = '/tmp/downloaded-file.jpg';
      const fileContent = Buffer.from('downloaded content');

      mockGetObject.promise.mockResolvedValue({
        Body: fileContent,
      });
      mockFs.writeFile.mockResolvedValue(undefined);

      await service.downloadFile(objectKey, localPath);

      expect(mockS3.getObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: objectKey,
      });
      expect(mockFs.writeFile).toHaveBeenCalledWith(localPath, fileContent);
    });

    it('should handle download errors', async () => {
      const objectKey = 'images/test/file.jpg';
      const localPath = '/tmp/downloaded-file.jpg';

      mockGetObject.promise.mockRejectedValue(new Error('Object not found'));

      await expect(service.downloadFile(objectKey, localPath)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getFileBuffer', () => {
    it('should get file as buffer', async () => {
      const objectKey = 'images/test/file.jpg';
      const fileContent = Buffer.from('file content');

      mockGetObject.promise.mockResolvedValue({
        Body: fileContent,
      });

      const result = await service.getFileBuffer(objectKey);

      expect(result).toBe(fileContent);
      expect(mockS3.getObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: objectKey,
      });
    });

    it('should handle missing file body', async () => {
      const objectKey = 'images/test/file.jpg';

      mockGetObject.promise.mockResolvedValue({
        Body: null,
      });

      await expect(service.getFileBuffer(objectKey)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file from S3', async () => {
      const objectKey = 'images/test/file.jpg';

      mockDeleteObject.promise.mockResolvedValue({});

      await service.deleteFile(objectKey);

      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: objectKey,
      });
    });

    it('should handle delete errors', async () => {
      const objectKey = 'images/test/file.jpg';

      mockDeleteObject.promise.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteFile(objectKey)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const objectKey = 'images/test/file.jpg';

      mockHeadObject.promise.mockResolvedValue({
        ContentLength: 1024,
      });

      const result = await service.fileExists(objectKey);

      expect(result).toBe(true);
      expect(mockS3.headObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: objectKey,
      });
    });

    it('should return false when file does not exist', async () => {
      const objectKey = 'images/test/nonexistent.jpg';

      const error = new Error('Not Found') as any;
      error.code = 'NotFound';
      mockHeadObject.promise.mockRejectedValue(error);

      const result = await service.fileExists(objectKey);

      expect(result).toBe(false);
    });

    it('should throw error for other S3 errors', async () => {
      const objectKey = 'images/test/file.jpg';

      mockHeadObject.promise.mockRejectedValue(new Error('Access denied'));

      await expect(service.fileExists(objectKey)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata', async () => {
      const objectKey = 'images/test/file.jpg';
      const lastModified = new Date();

      mockHeadObject.promise.mockResolvedValue({
        ContentType: 'image/jpeg',
        ContentLength: 1024 * 1024,
        LastModified: lastModified,
        Metadata: { originalName: 'test.jpg' },
      });

      const result = await service.getFileMetadata(objectKey);

      expect(result).toEqual({
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024,
        lastModified,
        metadata: { originalName: 'test.jpg' },
      });
    });
  });

  describe('generateObjectKey', () => {
    it('should generate object key for different file types', () => {
      const identifier = 'user-123';
      const extension = '.jpg';

      const avatarKey = service.generateObjectKey(FileType.AVATAR, identifier, extension);
      const imageKey = service.generateObjectKey(FileType.IMAGE, identifier, extension);
      const videoKey = service.generateObjectKey(FileType.VIDEO, identifier, extension);

      expect(avatarKey).toMatch(/^avatars\/user-123\/\d+_[a-f0-9]+\.jpg$/);
      expect(imageKey).toMatch(/^images\/user-123\/\d+_[a-f0-9]+\.jpg$/);
      expect(videoKey).toMatch(/^videos\/user-123\/\d+_[a-f0-9]+\.jpg$/);
    });
  });

  describe('getPublicUrl', () => {
    it('should generate public URL for object', () => {
      const objectKey = 'images/test/file.jpg';
      const result = service.getPublicUrl(objectKey);

      expect(result).toBe('https://cdn.example.com/test-bucket/images/test/file.jpg');
    });
  });

  describe('copyFile', () => {
    it('should copy file within S3', async () => {
      const sourceKey = 'images/test/source.jpg';
      const destinationKey = 'images/test/destination.jpg';

      mockCopyObject.promise.mockResolvedValue({});

      await service.copyFile(sourceKey, destinationKey);

      expect(mockS3.copyObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        CopySource: 'test-bucket/images/test/source.jpg',
        Key: destinationKey,
        ServerSideEncryption: 'AES256',
      });
    });
  });

  describe('healthCheck', () => {
    it('should return true when S3 is healthy', async () => {
      mockListObjectsV2.promise.mockResolvedValue({
        Contents: [],
      });

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockS3.listObjectsV2).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        MaxKeys: 1,
      });
    });

    it('should return false when S3 is unhealthy', async () => {
      mockListObjectsV2.promise.mockRejectedValue(new Error('Connection failed'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });
});