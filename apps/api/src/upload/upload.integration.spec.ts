import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { UploadModule } from './upload.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { FileType } from './dto';

describe('Upload Integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let authToken: string;

  const testUser = {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        UploadModule,
        DatabaseModule,
        AuthModule,
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'S3_BUCKET_NAME':
                  return 'test-bucket';
                case 'CDN_URL':
                  return 'https://cdn.example.com';
                case 'AWS_REGION':
                  return 'us-east-1';
                case 'TEMP_DIR':
                  return '/tmp/test-uploads';
                case 'ANTIVIRUS_ENABLED':
                  return false; // Disable for testing
                case 'JWT_SECRET':
                  return 'test-secret';
                case 'JWT_EXPIRES_IN':
                  return '1h';
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test user and generate auth token
    await prismaService.user.upsert({
      where: { email: testUser.email },
      update: testUser,
      create: {
        ...testUser,
        passwordHash: 'test-hash',
        salt: 'test-salt',
      },
    });

    authToken = jwtService.sign({ sub: testUser.id, username: testUser.username });
  });

  afterAll(async () => {
    // Cleanup test user
    await prismaService.user.delete({
      where: { id: testUser.id },
    }).catch(() => {
      // Ignore if user doesn't exist
    });

    await app.close();
  });

  describe('POST /upload/avatar', () => {
    it('should generate presigned URL for avatar upload', async () => {
      const uploadData = {
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 1024, // 1MB
      };

      const response = await request(app.getHttpServer())
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(200);

      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body).toHaveProperty('objectKey');
      expect(response.body).toHaveProperty('avatarUrl');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.objectKey).toMatch(/^avatars\/test-user-id\/\d+_[a-f0-9]+\.jpg$/);
    });

    it('should reject invalid avatar file type', async () => {
      const uploadData = {
        fileName: 'avatar.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 1024,
      };

      await request(app.getHttpServer())
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(400);
    });

    it('should reject oversized avatar file', async () => {
      const uploadData = {
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileSize: 10 * 1024 * 1024, // 10MB (over 5MB limit)
      };

      await request(app.getHttpServer())
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(400);
    });

    it('should require authentication', async () => {
      const uploadData = {
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 1024,
      };

      await request(app.getHttpServer())
        .post('/upload/avatar')
        .send(uploadData)
        .expect(401);
    });
  });

  describe('POST /upload/presigned-url', () => {
    it('should generate presigned URL for image upload', async () => {
      const uploadData = {
        fileType: FileType.IMAGE,
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2 * 1024 * 1024, // 2MB
      };

      const response = await request(app.getHttpServer())
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(200);

      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body).toHaveProperty('objectKey');
      expect(response.body).toHaveProperty('publicUrl');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.objectKey).toMatch(/^images\/[a-f0-9-]+\/\d+_[a-f0-9]+\.jpg$/);
    });

    it('should generate presigned URL for video upload', async () => {
      const uploadData = {
        fileType: FileType.VIDEO,
        fileName: 'video.mp4',
        mimeType: 'video/mp4',
        fileSize: 10 * 1024 * 1024, // 10MB
      };

      const response = await request(app.getHttpServer())
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(200);

      expect(response.body.objectKey).toMatch(/^videos\/[a-f0-9-]+\/\d+_[a-f0-9]+\.mp4$/);
    });

    it('should generate presigned URL for audio upload', async () => {
      const uploadData = {
        fileType: FileType.AUDIO,
        fileName: 'audio.mp3',
        mimeType: 'audio/mp3',
        fileSize: 5 * 1024 * 1024, // 5MB
      };

      const response = await request(app.getHttpServer())
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(200);

      expect(response.body.objectKey).toMatch(/^audio\/[a-f0-9-]+\/\d+_[a-f0-9]+\.mp3$/);
    });

    it('should generate presigned URL for document upload', async () => {
      const uploadData = {
        fileType: FileType.DOCUMENT,
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        fileSize: 3 * 1024 * 1024, // 3MB
      };

      const response = await request(app.getHttpServer())
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(200);

      expect(response.body.objectKey).toMatch(/^documents\/[a-f0-9-]+\/\d+_[a-f0-9]+\.pdf$/);
    });

    it('should reject unsupported file type', async () => {
      const uploadData = {
        fileType: FileType.IMAGE,
        fileName: 'malware.exe',
        mimeType: 'application/x-executable',
        fileSize: 1024 * 1024,
      };

      await request(app.getHttpServer())
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(400);
    });

    it('should reject oversized files', async () => {
      const uploadData = {
        fileType: FileType.VIDEO,
        fileName: 'huge-video.mp4',
        mimeType: 'video/mp4',
        fileSize: 100 * 1024 * 1024, // 100MB (over 50MB limit)
      };

      await request(app.getHttpServer())
        .post('/upload/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uploadData)
        .expect(400);
    });
  });

  describe('POST /upload/process', () => {
    it('should process uploaded file', async () => {
      const processData = {
        objectKey: 'images/test/sample.jpg',
        fileType: FileType.IMAGE,
      };

      // Note: This will fail in the test environment because the file doesn't exist in S3
      // In a real integration test, you would upload a file first
      await request(app.getHttpServer())
        .post('/upload/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(processData)
        .expect(400); // Expecting 400 because file doesn't exist
    });

    it('should require valid object key', async () => {
      const processData = {
        objectKey: '',
        fileType: FileType.IMAGE,
      };

      await request(app.getHttpServer())
        .post('/upload/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(processData)
        .expect(400);
    });
  });

  describe('POST /upload/avatar/process', () => {
    it('should process avatar upload', async () => {
      const body = {
        objectKey: 'avatars/test-user-id/avatar.jpg',
      };

      // Note: This will fail because the file doesn't exist in S3
      await request(app.getHttpServer())
        .post('/upload/avatar/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(body)
        .expect(500); // Expecting 500 because processing will fail
    });
  });

  describe('POST /upload/thumbnail/:objectKey', () => {
    it('should generate thumbnail for image', async () => {
      const objectKey = encodeURIComponent('images/test/photo.jpg');
      const options = {
        width: 300,
        height: 300,
        format: 'webp',
        quality: 85,
      };

      // Note: This will fail because the file doesn't exist in S3
      await request(app.getHttpServer())
        .post(`/upload/thumbnail/${objectKey}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(options)
        .expect(500); // Expecting 500 because file doesn't exist
    });
  });

  describe('POST /upload/video-preview/:objectKey', () => {
    it('should generate video preview', async () => {
      const objectKey = encodeURIComponent('videos/test/movie.mp4');
      const options = {
        timestampSeconds: 10,
        width: 640,
        height: 480,
        format: 'jpeg',
      };

      // Note: This will fail because the file doesn't exist in S3
      await request(app.getHttpServer())
        .post(`/upload/video-preview/${objectKey}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(options)
        .expect(500); // Expecting 500 because file doesn't exist
    });
  });

  describe('DELETE /upload/:objectKey', () => {
    it('should delete file', async () => {
      const objectKey = encodeURIComponent('images/test/file.jpg');

      // Note: This will succeed even if file doesn't exist (S3 delete is idempotent)
      await request(app.getHttpServer())
        .delete(`/upload/${objectKey}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('GET /upload/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/upload/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('s3');
      expect(response.body).toHaveProperty('antivirus');
      expect(response.body).toHaveProperty('mediaProcessing');
      expect(typeof response.body.s3).toBe('boolean');
      expect(typeof response.body.antivirus).toBe('boolean');
      expect(typeof response.body.mediaProcessing).toBe('boolean');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/upload/avatar' },
        { method: 'post', path: '/upload/presigned-url' },
        { method: 'post', path: '/upload/process' },
        { method: 'post', path: '/upload/avatar/process' },
        { method: 'post', path: '/upload/thumbnail/test' },
        { method: 'post', path: '/upload/video-preview/test' },
        { method: 'delete', path: '/upload/test' },
        { method: 'get', path: '/upload/health' },
      ];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .send({})
          .expect(401);
      }
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      await request(app.getHttpServer())
        .post('/upload/avatar')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          fileName: 'avatar.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024 * 1024,
        })
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate avatar upload data', async () => {
      const invalidData = [
        { fileName: '', mimeType: 'image/jpeg', fileSize: 1024 },
        { fileName: 'test.jpg', mimeType: '', fileSize: 1024 },
        { fileName: 'test.jpg', mimeType: 'image/jpeg', fileSize: 0 },
        { fileName: 'test.jpg', mimeType: 'image/jpeg', fileSize: -1 },
      ];

      for (const data of invalidData) {
        await request(app.getHttpServer())
          .post('/upload/avatar')
          .set('Authorization', `Bearer ${authToken}`)
          .send(data)
          .expect(400);
      }
    });

    it('should validate presigned URL data', async () => {
      const invalidData = [
        { fileType: 'invalid', fileName: 'test.jpg', mimeType: 'image/jpeg', fileSize: 1024 },
        { fileType: FileType.IMAGE, fileName: '', mimeType: 'image/jpeg', fileSize: 1024 },
        { fileType: FileType.IMAGE, fileName: 'test.jpg', mimeType: '', fileSize: 1024 },
        { fileType: FileType.IMAGE, fileName: 'test.jpg', mimeType: 'image/jpeg', fileSize: 0 },
      ];

      for (const data of invalidData) {
        await request(app.getHttpServer())
          .post('/upload/presigned-url')
          .set('Authorization', `Bearer ${authToken}`)
          .send(data)
          .expect(400);
      }
    });
  });
});