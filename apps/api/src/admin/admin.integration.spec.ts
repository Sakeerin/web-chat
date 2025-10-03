import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AdminModule } from './admin.module'
import { DatabaseModule } from '../database/database.module'
import { PrismaService } from '../database/prisma.service'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '@nestjs/config'

describe('Admin Integration Tests', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let adminToken: string
  let moderatorToken: string
  let userToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        DatabaseModule,
        AdminModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    prismaService = moduleFixture.get<PrismaService>(PrismaService)

    // Create test users and tokens
    await setupTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
    await app.close()
  })

  async function setupTestData() {
    // Create test users with different roles
    const adminUser = await prismaService.user.create({
      data: {
        username: 'admin_test',
        email: 'admin@test.com',
        name: 'Admin User',
        passwordHash: 'hashed_password',
        salt: 'salt',
        role: 'ADMIN',
      },
    })

    const moderatorUser = await prismaService.user.create({
      data: {
        username: 'moderator_test',
        email: 'moderator@test.com',
        name: 'Moderator User',
        passwordHash: 'hashed_password',
        salt: 'salt',
        role: 'MODERATOR',
      },
    })

    const regularUser = await prismaService.user.create({
      data: {
        username: 'user_test',
        email: 'user@test.com',
        name: 'Regular User',
        passwordHash: 'hashed_password',
        salt: 'salt',
        role: 'USER',
      },
    })

    // Create test tokens (simplified for testing)
    adminToken = 'Bearer admin-token'
    moderatorToken = 'Bearer moderator-token'
    userToken = 'Bearer user-token'

    // Create a test report
    await prismaService.userReport.create({
      data: {
        reporterId: regularUser.id,
        reportedUserId: moderatorUser.id,
        reason: 'Inappropriate behavior',
        description: 'Test report description',
        status: 'PENDING',
      },
    })
  }

  async function cleanupTestData() {
    await prismaService.userReport.deleteMany({
      where: {
        OR: [
          { reporter: { email: { contains: '@test.com' } } },
          { reported: { email: { contains: '@test.com' } } },
        ],
      },
    })
    await prismaService.user.deleteMany({
      where: { email: { contains: '@test.com' } },
    })
  }

  describe('GET /admin/users', () => {
    it('should return users for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', adminToken)
        .expect(200)

      expect(response.body).toHaveProperty('users')
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('pages')
      expect(Array.isArray(response.body.users)).toBe(true)
    })

    it('should return users for moderator', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', moderatorToken)
        .expect(200)

      expect(response.body).toHaveProperty('users')
    })

    it('should deny access for regular user', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', userToken)
        .expect(403)
    })

    it('should deny access without token', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .expect(401)
    })
  })

  describe('GET /admin/reports', () => {
    it('should return reports for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/reports')
        .set('Authorization', adminToken)
        .expect(200)

      expect(response.body).toHaveProperty('reports')
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('pages')
      expect(Array.isArray(response.body.reports)).toBe(true)
    })

    it('should filter reports by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/reports?status=PENDING')
        .set('Authorization', adminToken)
        .expect(200)

      expect(response.body.reports.every((report: any) => report.status === 'PENDING')).toBe(true)
    })
  })

  describe('GET /admin/analytics', () => {
    it('should return system analytics for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/analytics')
        .set('Authorization', adminToken)
        .expect(200)

      expect(response.body).toHaveProperty('totalUsers')
      expect(response.body).toHaveProperty('activeUsers')
      expect(response.body).toHaveProperty('totalMessages')
      expect(response.body).toHaveProperty('totalReports')
      expect(typeof response.body.totalUsers).toBe('number')
    })
  })

  describe('GET /admin/audit-logs', () => {
    it('should return audit logs for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', adminToken)
        .expect(200)

      expect(response.body).toHaveProperty('logs')
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('pages')
      expect(Array.isArray(response.body.logs)).toBe(true)
    })

    it('should filter audit logs by action', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?action=USER_SUSPENDED')
        .set('Authorization', adminToken)
        .expect(200)

      expect(response.body).toHaveProperty('logs')
    })
  })

  describe('POST /admin/users/:userId/suspend', () => {
    it('should suspend user with valid reason', async () => {
      const user = await prismaService.user.findFirst({
        where: { role: 'USER' },
      })

      const response = await request(app.getHttpServer())
        .post(`/admin/users/${user!.id}/suspend`)
        .set('Authorization', adminToken)
        .send({
          reason: 'Policy violation',
          duration: 24,
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('suspended')
    })

    it('should reject suspension without reason', async () => {
      const user = await prismaService.user.findFirst({
        where: { role: 'USER' },
      })

      await request(app.getHttpServer())
        .post(`/admin/users/${user!.id}/suspend`)
        .set('Authorization', adminToken)
        .send({
          duration: 24,
        })
        .expect(400)
    })
  })

  describe('PUT /admin/reports/:reportId/review', () => {
    it('should review report with valid data', async () => {
      const report = await prismaService.userReport.findFirst({
        where: { status: 'PENDING' },
      })

      const response = await request(app.getHttpServer())
        .put(`/admin/reports/${report!.id}/review`)
        .set('Authorization', adminToken)
        .send({
          status: 'RESOLVED',
          resolution: 'Issue has been addressed',
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('resolved')
    })

    it('should reject invalid status', async () => {
      const report = await prismaService.userReport.findFirst()

      await request(app.getHttpServer())
        .put(`/admin/reports/${report!.id}/review`)
        .set('Authorization', adminToken)
        .send({
          status: 'INVALID_STATUS',
        })
        .expect(400)
    })
  })
})