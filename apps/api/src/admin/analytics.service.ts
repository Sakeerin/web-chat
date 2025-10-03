import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { SystemAnalytics } from './interfaces/admin.interface'
import { GetAnalyticsDto } from './dto/admin.dto'

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSystemAnalytics(
    getAnalyticsDto?: GetAnalyticsDto,
  ): Promise<SystemAnalytics> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalMessages,
      totalConversations,
      totalReports,
      pendingReports,
      dailyActiveUsers,
      messagesSentToday,
      reportsToday,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),
      
      // Active users (not suspended or banned)
      this.prisma.user.count({
        where: {
          isActive: true,
          isSuspended: false,
        },
      }),
      
      // Suspended users
      this.prisma.user.count({
        where: { isSuspended: true },
      }),
      
      // Total messages
      this.prisma.message.count({
        where: { isDeleted: false },
      }),
      
      // Total conversations
      this.prisma.conversation.count({
        where: { isArchived: false },
      }),
      
      // Total reports
      this.prisma.userReport.count(),
      
      // Pending reports
      this.prisma.userReport.count({
        where: { status: 'PENDING' },
      }),
      
      // Daily active users (users who were online in the last 24 hours)
      this.prisma.user.count({
        where: {
          lastSeenAt: { gte: yesterday },
          isActive: true,
        },
      }),
      
      // Messages sent today
      this.prisma.message.count({
        where: {
          createdAt: { gte: today },
          isDeleted: false,
        },
      }),
      
      // Reports created today
      this.prisma.userReport.count({
        where: { createdAt: { gte: today } },
      }),
    ])

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalMessages,
      totalConversations,
      totalReports,
      pendingReports,
      dailyActiveUsers,
      messagesSentToday,
      reportsToday,
    }
  }

  async getUserGrowthAnalytics(days: number = 30): Promise<{
    dailySignups: Array<{ date: string; count: number }>
    totalGrowth: number
    averageDaily: number
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const dailySignups: Array<{ date: string; count: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const count = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      dailySignups.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      })
    }

    const totalGrowth = dailySignups.reduce((sum, day) => sum + day.count, 0)
    const averageDaily = totalGrowth / days

    return {
      dailySignups,
      totalGrowth,
      averageDaily: Math.round(averageDaily * 100) / 100,
    }
  }

  async getMessageAnalytics(days: number = 30): Promise<{
    dailyMessages: Array<{ date: string; count: number }>
    totalMessages: number
    averageDaily: number
    messagesByType: Record<string, number>
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const [dailyMessages, messagesByType] = await Promise.all([
      this.getDailyMessageCounts(days),
      this.prisma.message.groupBy({
        by: ['type'],
        where: {
          createdAt: { gte: startDate },
          isDeleted: false,
        },
        _count: { type: true },
      }),
    ])

    const totalMessages = dailyMessages.reduce((sum, day) => sum + day.count, 0)
    const averageDaily = totalMessages / days

    return {
      dailyMessages,
      totalMessages,
      averageDaily: Math.round(averageDaily * 100) / 100,
      messagesByType: messagesByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count.type
          return acc
        },
        {} as Record<string, number>,
      ),
    }
  }

  async getReportAnalytics(days: number = 30): Promise<{
    dailyReports: Array<{ date: string; count: number }>
    reportsByStatus: Record<string, number>
    reportsByReason: Record<string, number>
    averageResolutionTime: number
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const [dailyReports, reportsByStatus, reportsByReason, resolvedReports] = await Promise.all([
      this.getDailyReportCounts(days),
      this.prisma.userReport.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { status: true },
      }),
      this.prisma.userReport.groupBy({
        by: ['reason'],
        where: { createdAt: { gte: startDate } },
        _count: { reason: true },
      }),
      this.prisma.userReport.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['RESOLVED', 'DISMISSED'] },
          reviewedAt: { not: null },
        },
        select: {
          createdAt: true,
          reviewedAt: true,
        },
      }),
    ])

    // Calculate average resolution time
    const resolutionTimes = resolvedReports
      .filter(report => report.reviewedAt)
      .map(report => 
        report.reviewedAt!.getTime() - report.createdAt.getTime()
      )
    
    const averageResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0

    return {
      dailyReports,
      reportsByStatus: reportsByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status
          return acc
        },
        {} as Record<string, number>,
      ),
      reportsByReason: reportsByReason.reduce(
        (acc, item) => {
          acc[item.reason] = item._count.reason
          return acc
        },
        {} as Record<string, number>,
      ),
      averageResolutionTime: Math.round(averageResolutionTime / (1000 * 60 * 60)), // Convert to hours
    }
  }

  private async getDailyMessageCounts(days: number): Promise<Array<{ date: string; count: number }>> {
    const dailyMessages: Array<{ date: string; count: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const count = await this.prisma.message.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
          isDeleted: false,
        },
      })

      dailyMessages.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      })
    }
    return dailyMessages
  }

  private async getDailyReportCounts(days: number): Promise<Array<{ date: string; count: number }>> {
    const dailyReports: Array<{ date: string; count: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const count = await this.prisma.userReport.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      dailyReports.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      })
    }
    return dailyReports
  }
}