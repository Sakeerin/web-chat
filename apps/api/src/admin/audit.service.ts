import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { AuditLogEntry, AdminAction } from './interfaces/admin.interface'
import { GetAuditLogsDto } from './dto/admin.dto'

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    adminId: string,
    action: AdminAction,
    resource: string,
    resourceId?: string,
    details: Record<string, any> = {},
  ): Promise<AuditLogEntry> {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        adminId,
        action,
        resource,
        resourceId,
        details,
      },
    })

    return auditLog as AuditLogEntry
  }

  async getAuditLogs(
    getAuditLogsDto: GetAuditLogsDto,
  ): Promise<{ logs: AuditLogEntry[]; total: number; pages: number }> {
    const {
      adminId,
      action,
      resource,
      startDate,
      endDate,
      page,
      limit,
    } = getAuditLogsDto

    const skip = (page - 1) * limit
    const where: any = {}

    if (adminId) {
      where.adminId = adminId
    }

    if (action) {
      where.action = action
    }

    if (resource) {
      where.resource = resource
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return {
      logs: logs as AuditLogEntry[],
      total,
      pages: Math.ceil(total / limit),
    }
  }

  async getAuditLogById(logId: string): Promise<AuditLogEntry | null> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id: logId },
    })

    return log as AuditLogEntry | null
  }

  async getAdminActivity(
    adminId: string,
    days: number = 30,
  ): Promise<{
    totalActions: number
    actionsByType: Record<string, number>
    recentActions: AuditLogEntry[]
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [totalActions, actionsByType, recentActions] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          adminId,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          adminId,
          createdAt: { gte: startDate },
        },
        _count: { action: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          adminId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    const actionsByTypeMap = actionsByType.reduce(
      (acc, item) => {
        acc[item.action] = item._count.action
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalActions,
      actionsByType: actionsByTypeMap,
      recentActions: recentActions as AuditLogEntry[],
    }
  }

  async getSystemAuditSummary(
    days: number = 7,
  ): Promise<{
    totalActions: number
    actionsByType: Record<string, number>
    actionsByAdmin: Record<string, number>
    dailyActivity: Array<{ date: string; count: number }>
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [totalActions, actionsByType, actionsByAdmin] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: { action: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['adminId'],
        where: { createdAt: { gte: startDate } },
        _count: { adminId: true },
      }),
    ])

    // Get daily activity
    const dailyActivity: Array<{ date: string; count: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const count = await this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      dailyActivity.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      })
    }

    return {
      totalActions,
      actionsByType: actionsByType.reduce(
        (acc, item) => {
          acc[item.action] = item._count.action
          return acc
        },
        {} as Record<string, number>,
      ),
      actionsByAdmin: actionsByAdmin.reduce(
        (acc, item) => {
          acc[item.adminId] = item._count.adminId
          return acc
        },
        {} as Record<string, number>,
      ),
      dailyActivity,
    }
  }
}