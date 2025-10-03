import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../app.module'

describe('REST API Infrastructure (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    
    // Apply the same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    )

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Error Handling', () => {
    it('should return structured error response for 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404)

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.any(String),
          timestamp: expect.any(String),
          requestId: expect.any(String),
          path: '/non-existent-endpoint',
        },
      })
    })

    it('should return validation error for invalid input', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // too short
          username: 'ab', // too short
          name: '',
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: 'Validation failed',
          details: expect.any(Object),
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      })
    })
  })

  describe('Response Transformation', () => {
    it('should transform successful responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        data: {
          status: 'ok',
          timestamp: expect.any(String),
          service: 'telegram-chat-api',
        },
        success: true,
        timestamp: expect.any(String),
        path: '/health',
      })
    })
  })

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200)

      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // Make multiple requests to trigger rate limiting
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
      )

      const responses = await Promise.all(promises)
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .expect(401)

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: expect.any(String),
        },
      })
    })

    it('should allow access to public endpoints', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200)

      await request(app.getHttpServer())
        .get('/')
        .expect(200)
    })
  })

  describe('Swagger Documentation', () => {
    it('should serve API documentation in development', async () => {
      // Only test if not in production
      if (process.env.NODE_ENV !== 'production') {
        await request(app.getHttpServer())
          .get('/api/docs')
          .expect(200)
      }
    })
  })
})