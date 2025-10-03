import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { AuditService } from './audit.service'
import { PrismaService } from '../database/prisma.service'
import { NotFoundException, ForbiddenException } from '@nestjs/common'

describe('AdminService', () => {
  let service: AdminService
  let prismaService: PrismaService
  let auditService: AuditService

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }

  const mockAuditService = {
    logAction: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
    prismaService = module.get<PrismaService>(PrismaService)
    auditService = module.get<AuditService>(AuditService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'user1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'USER',
          isActive: true,
          isSuspended: false,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ]

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers)
      mockPrismaService.user.count.mockResolvedValue(1)

      const result = await service.getUsers(1, 20)

      expect(result).toEqual({
        users: mockUsers,
        total: 1,
        pages: 1,
      })
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should filter users by search term', async () => {
      const mockUsers = []
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers)
      mockPrismaService.user.count.mockResolvedValue(0)

      await service.getUsers(1, 20, 'john')

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
            { name: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('suspendUser', () => {
    it('should suspend a user successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        role: 'USER',
      }
      const mockUpdatedUser = {
        ...mockUser,
        isSuspended: true,
        suspendedUntil: new Date(),
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser)

      const result = await service.suspendUser(
        { userId: '1', reason: 'Violation', duration: 24 },
        'admin1'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('suspended')
      expect(mockAuditService.logAction).toHaveBeenCalled()
    })

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(
        service.suspendUser(
          { userId: '1', reason: 'Violation' },
          'admin1'
        )
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when trying to suspend admin', async () => {
      const mockAdminUser = {
        id: '1',
        username: 'admin1',
        role: 'ADMIN',
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser)

      await expect(
        service.suspendUser(
          { userId: '1', reason: 'Violation' },
          'admin1'
        )
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('banUser', () => {
    it('should ban a user successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        role: 'USER',
      }
      const mockUpdatedUser = {
        ...mockUser,
        isActive: false,
        isSuspended: true,
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser)

      const result = await service.banUser(
        { userId: '1', reason: 'Severe violation', permanent: true },
        'admin1'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('banned')
      expect(mockAuditService.logAction).toHaveBeenCalled()
    })

    it('should throw ForbiddenException when trying to ban admin', async () => {
      const mockAdminUser = {
        id: '1',
        username: 'admin1',
        role: 'ADMIN',
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser)

      await expect(
        service.banUser(
          { userId: '1', reason: 'Violation', permanent: true },
          'admin1'
        )
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        role: 'USER',
      }
      const mockUpdatedUser = {
        ...mockUser,
        role: 'MODERATOR',
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser)

      const result = await service.updateUserRole(
        { userId: '1', role: 'MODERATOR' },
        'admin1'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('role updated')
      expect(mockAuditService.logAction).toHaveBeenCalled()
    })
  })
})