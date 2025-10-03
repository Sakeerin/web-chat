import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileType } from '../dto';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: AWS.S3;
  private readonly bucketName: string;
  private readonly cdnUrl: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'chat-uploads';
    this.cdnUrl = this.configService.get<string>('CDN_URL') || 'http://localhost:9000';
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.region,
    });

    // For local development with MinIO
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const s3Config: AWS.S3.ClientConfiguration = {
      region: this.region,
      signatureVersion: 'v4',
    };

    if (endpoint) {
      s3Config.endpoint = endpoint;
      s3Config.s3ForcePathStyle = true; // Required for MinIO
    }

    this.s3 = new AWS.S3(s3Config);
  }

  /**
   * Generate presigned URL for file upload
   */
  async generatePresignedUploadUrl(
    objectKey: string,
    mimeType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey,
        Expires: expiresIn,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      };

      const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params);
      this.logger.log(`Generated presigned upload URL for: ${objectKey}`);
      
      return uploadUrl;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  /**
   * Generate presigned URL for file download
   */
  async generatePresignedDownloadUrl(
    objectKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey,
        Expires: expiresIn,
      };

      const downloadUrl = await this.s3.getSignedUrlPromise('getObject', params);
      this.logger.log(`Generated presigned download URL for: ${objectKey}`);
      
      return downloadUrl;
    } catch (error) {
      this.logger.error(`Failed to generate download URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  /**
   * Upload file from local path to S3
   */
  async uploadFile(
    localPath: string,
    objectKey: string,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(localPath);
      
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: metadata || {},
      };

      await this.s3.upload(params).promise();
      
      const publicUrl = this.getPublicUrl(objectKey);
      this.logger.log(`Uploaded file to S3: ${objectKey}`);
      
      return publicUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Upload buffer to S3
   */
  async uploadBuffer(
    buffer: Buffer,
    objectKey: string,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    try {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: metadata || {},
      };

      await this.s3.upload(params).promise();
      
      const publicUrl = this.getPublicUrl(objectKey);
      this.logger.log(`Uploaded buffer to S3: ${objectKey}`);
      
      return publicUrl;
    } catch (error) {
      this.logger.error(`Failed to upload buffer: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload buffer');
    }
  }

  /**
   * Download file from S3 to local path
   */
  async downloadFile(objectKey: string, localPath: string): Promise<void> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey,
      };

      const data = await this.s3.getObject(params).promise();
      
      if (data.Body) {
        await fs.writeFile(localPath, data.Body as Buffer);
        this.logger.log(`Downloaded file from S3: ${objectKey} -> ${localPath}`);
      } else {
        throw new Error('No data received from S3');
      }
    } catch (error) {
      this.logger.error(`Failed to download file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to download file');
    }
  }

  /**
   * Get file as buffer from S3
   */
  async getFileBuffer(objectKey: string): Promise<Buffer> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey,
      };

      const data = await this.s3.getObject(params).promise();
      
      if (data.Body) {
        this.logger.log(`Retrieved file buffer from S3: ${objectKey}`);
        return data.Body as Buffer;
      } else {
        throw new Error('No data received from S3');
      }
    } catch (error) {
      this.logger.error(`Failed to get file buffer: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve file');
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(objectKey: string): Promise<void> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey,
      };

      await this.s3.deleteObject(params).promise();
      this.logger.log(`Deleted file from S3: ${objectKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(objectKey: string): Promise<boolean> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey,
      };

      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      
      this.logger.error(`Failed to check file existence: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to check file existence');
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(objectKey: string): Promise<{
    contentType: string;
    contentLength: number;
    lastModified: Date;
    metadata: Record<string, string>;
  }> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey,
      };

      const data = await this.s3.headObject(params).promise();
      
      return {
        contentType: data.ContentType || 'application/octet-stream',
        contentLength: data.ContentLength || 0,
        lastModified: data.LastModified || new Date(),
        metadata: data.Metadata || {},
      };
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get file metadata');
    }
  }

  /**
   * Generate object key for file upload
   */
  generateObjectKey(fileType: FileType, identifier: string, extension: string): string {
    const folder = this.getFolderForFileType(fileType);
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    
    return `${folder}/${identifier}/${timestamp}_${randomSuffix}${extension}`;
  }

  /**
   * Get public URL for object
   */
  getPublicUrl(objectKey: string): string {
    return `${this.cdnUrl}/${this.bucketName}/${objectKey}`;
  }

  /**
   * Copy file within S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const params = {
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
        ServerSideEncryption: 'AES256',
      };

      await this.s3.copyObject(params).promise();
      this.logger.log(`Copied file in S3: ${sourceKey} -> ${destinationKey}`);
    } catch (error) {
      this.logger.error(`Failed to copy file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to copy file');
    }
  }

  /**
   * Health check for S3 service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list objects in the bucket (with limit 1)
      const params = {
        Bucket: this.bucketName,
        MaxKeys: 1,
      };

      await this.s3.listObjectsV2(params).promise();
      return true;
    } catch (error) {
      this.logger.error(`S3 health check failed: ${error.message}`);
      return false;
    }
  }

  // Private helper methods

  private getFolderForFileType(fileType: FileType): string {
    switch (fileType) {
      case FileType.AVATAR:
        return 'avatars';
      case FileType.IMAGE:
        return 'images';
      case FileType.VIDEO:
        return 'videos';
      case FileType.AUDIO:
        return 'audio';
      case FileType.DOCUMENT:
        return 'documents';
      default:
        return 'files';
    }
  }
}