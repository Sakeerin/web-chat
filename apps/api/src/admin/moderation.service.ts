import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { AuditService } from './audit.service'
import {
  UserReport,
  ReportReviewResult,
  ReportStatus,
  AdminAction,
} from './interfaces/admin.interface'
import {
  ReviewReportDto,
  GetReportsDto,
  DeleteMessageDto,
  DeleteConversationDto,
} from './dto/admin.dto'

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getReports(
    getReportsDto: GetReportsDto,
  ): Promise<{ reports: UserReport[]; total: number; pages: number }> {
    const { status, page, limit } = getReportsDto
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) {
      where.status = status
    }

    const [reports, total] = await Promise.all([
      this.prisma.userReport.findMany({
        where,
        skip,
        take: limit,
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
          reported: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userReport.count({ where }),
    ])

    return {
      reports: reports as UserReport[],
      total,
      pages: Math.ceil(total / limit),
    }
  }

  async getReportById(reportId: string): Promise<UserReport> {
    const report = await this.prisma.userReport.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
          },
        },
        reported: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            isActive: true,
            isSuspended: true,
            role: true,
          },
        },
      },
    })

    if (!report) {
      throw new NotFoundException('Report not found')
    }

    return report as UserReport
  }

  async reviewReport(
    reviewReportDto: ReviewReportDto,
    adminId: string,
  ): Promise<ReportReviewResult> {
    const { reportId, status, resolution } = reviewReportDto

    const report = await this.prisma.userReport.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { username: true } },
        reported: { select: { username: true } },
      },
    })

    if (!report) {
      throw new NotFoundException('Report not found')
    }

    const updatedReport = await this.prisma.userReport.update({
      where: { id: reportId },
      data: {
        status,
        resolution,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        reported: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    })

    // Log the action
    const action = status === 'RESOLVED' 
      ? AdminAction.REPORT_RESOLVED 
      : status === 'DISMISSED' 
        ? AdminAction.REPORT_DISMISSED 
        : AdminAction.REPORT_REVIEWED

    await this.auditService.logAction(
      adminId,
      action,
      'report',
      reportId,
      { status, resolution, reportedUser: report.reported.username },
    )

    return {
      success: true,
      message: `Report has been ${status.toLowerCase()}`,
      report: updatedReport as UserReport,
    }
  }

  async deleteMessage(
    deleteMessageDto: DeleteMessageDto,
    adminId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { messageId, reason } = deleteMessageDto

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { username: true } },
        conversation: { select: { id: true, type: true } },
      },
    })

    if (!message) {
      throw new NotFoundException('Message not found')
    }

    if (message.isDeleted) {
      return {
        success: false,
        message: 'Message is already deleted',
      }
    }

    // Soft delete the message
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[Message deleted by moderator]',
      },
    })

    // Log the action
    await this.auditService.logAction(
      adminId,
      AdminAction.MESSAGE_DELETED,
      'message',
      messageId,
      {
        reason,
        originalSender: message.sender.username,
        conversationId: message.conversationId,
        conversationType: message.conversation.type,
      },
    )

    return {
      success: true,
      message: 'Message has been deleted',
    }
  }

  async deleteConversation(
    deleteConversationDto: DeleteConversationDto,
    adminId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { conversationId, reason } = deleteConversationDto

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        owner: { select: { username: true } },
        _count: { select: { messages: true, members: true } },
      },
    })

    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    // Archive the conversation instead of hard delete
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isArchived: true,
        title: conversation.title ? `[DELETED] ${conversation.title}` : '[DELETED]',
      },
    })

    // Soft delete all messages in the conversation
    await this.prisma.message.updateMany({
      where: { conversationId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[Message deleted due to conversation removal]',
      },
    })

    // Log the action
    await this.auditService.logAction(
      adminId,
      AdminAction.CONVERSATION_DELETED,
      'conversation',
      conversationId,
      {
        reason,
        type: conversation.type,
        owner: conversation.owner?.username,
        messageCount: conversation._count.messages,
        memberCount: conversation._count.members,
      },
    )

    return {
      success: true,
      message: 'Conversation has been deleted',
    }
  }

  async getReportedContent(
    reportId: string,
  ): Promise<{
    messages: any[]
    conversations: any[]
    userActivity: any
  }> {
    const report = await this.prisma.userReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      throw new NotFoundException('Report not found')
    }

    // Get recent messages from the reported user
    const messages = await this.prisma.message.findMany({
      where: {
        senderId: report.reportedUserId,
        isDeleted: false,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        conversation: {
          select: {
            id: true,
            type: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Get conversations the user is part of
    const conversations = await this.prisma.conversationMember.findMany({
      where: {
        userId: report.reportedUserId,
        isActive: true,
      },
      include: {
        conversation: {
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            _count: {
              select: { messages: true, members: true },
            },
          },
        },
      },
      take: 20,
    })

    // Get user activity summary
    const userActivity = await this.prisma.user.findUnique({
      where: { id: report.reportedUserId },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        lastSeenAt: true,
        isActive: true,
        isSuspended: true,
        _count: {
          select: {
            sentMessages: true,
            conversationMembers: true,
            reportsMade: true,
            reportsReceived: true,
          },
        },
      },
    })

    return {
      messages,
      conversations: conversations.map(cm => cm.conversation),
      userActivity,
    }
  }
}