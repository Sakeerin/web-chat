import { Test, TestingModule } from '@nestjs/testing'
import { ModerationService } from './moderation.service'
import { AuditService } from './audit.service'
import { PrismaService } from '../database/prisma.service'
import { NotFoundException } from '@nestjs/common'

describe('ModerationService', () => {
  let service: ModerationService
  let prismaService: PrismaService
  let auditService: AuditService

  const mockPrismaService = {
    userReport: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    conversationMember: {
      findMany: jest.fn(),
    },
  }

  const mockAuditService = {
    logAction: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
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

    service = module.get<ModerationService>(ModerationService)
    prismaService = module.get<PrismaService>(PrismaService)
    auditService = module.get<AuditService>(AuditService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getReports', () => {
    it('should return paginated reports', async () => {
      const mockReports = [
        {
          id: '1',
          reporterId: 'reporter1',
          reportedUserId: 'reported1',
          reason: 'Spam',
          status: 'PENDING',
          createdAt: new Date(),
          reporter: { id: 'reporter1', username: 'reporter', name: 'Reporter' },
          reported: { id: 'reported1', username: 'reported', name: 'Reported' },
        },
      ]

      mockPrismaService.userReport.findMany.mockResolvedValue(mockReports)
      mockPrismaService.userReport.count.mockResolvedValue(1)

      const result = await service.getReports({ page: 1, limit: 20 })

      expect(result).toEqual({
        reports: mockReports,
        total: 1,
        pages: 1,
      })
    })
  })

  describe('reviewReport', () => {
    it('should review a report successfully', async () => {
      const mockReport = {
        id: '1',
        reporterId: 'reporter1',
        reportedUserId: 'reported1',
        status: 'PENDING',
        reporter: { username: 'reporter' },
        reported: { username: 'reported' },
      }
      const mockUpdatedReport = {
        ...mockReport,
        status: 'RESOLVED',
        resolution: 'Issue resolved',
        reviewedBy: 'admin1',
        reviewedAt: new Date(),
      }

      mockPrismaService.userReport.findUnique.mockResolvedValue(mockReport)
      mockPrismaService.userReport.update.mockResolvedValue(mockUpdatedReport)

      const result = await service.reviewReport(
        { reportId: '1', status: 'RESOLVED', resolution: 'Issue resolved' },
        'admin1'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('resolved')
      expect(mockAuditService.logAction).toHaveBeenCalled()
    })

    it('should throw NotFoundException for non-existent report', async () => {
      mockPrismaService.userReport.findUnique.mockResolvedValue(null)

      await expect(
        service.reviewReport(
          { reportId: '1', status: 'RESOLVED' },
          'admin1'
        )
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('deleteMessage', () => {
    it('should delete a message successfully', async () => {
      const mockMessage = {
        id: '1',
        isDeleted: false,
        sender: { username: 'sender' },
        conversation: { id: 'conv1', type: 'DM' },
        conversationId: 'conv1',
      }

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage)
      mockPrismaService.message.update.mockResolvedValue({
        ...mockMessage,
        isDeleted: true,
        deletedAt: new Date(),
      })

      const result = await service.deleteMessage(
        { messageId: '1', reason: 'Inappropriate content' },
        'admin1'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('deleted')
      expect(mockAuditService.logAction).toHaveBeenCalled()
    })

    it('should return error for already deleted message', async () => {
      const mockMessage = {
        id: '1',
        isDeleted: true,
        sender: { username: 'sender' },
        conversation: { id: 'conv1', type: 'DM' },
      }

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage)

      const result = await service.deleteMessage(
        { messageId: '1', reason: 'Inappropriate content' },
        'admin1'
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('already deleted')
    })
  })

  describe('deleteConversation', () => {
    it('should delete a conversation successfully', async () => {
      const mockConversation = {
        id: '1',
        title: 'Test Conversation',
        type: 'GROUP',
        owner: { username: 'owner' },
        _count: { messages: 10, members: 5 },
      }

      mockPrismaService.conversation.findUnique.mockResolvedValue(mockConversation)
      mockPrismaService.conversation.update.mockResolvedValue({
        ...mockConversation,
        isArchived: true,
      })
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 10 })

      const result = await service.deleteConversation(
        { conversationId: '1', reason: 'Policy violation' },
        'admin1'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('deleted')
      expect(mockAuditService.logAction).toHaveBeenCalled()
    })
  })
})