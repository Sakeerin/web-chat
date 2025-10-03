import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from './guards/admin.guard'
import { AdminService } from './admin.service'
import { ModerationService } from './moderation.service'
import { AuditService } from './audit.service'
import { AnalyticsService } from './analytics.service'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import {
  SuspendUserSchema,
  BanUserSchema,
  UpdateUserRoleSchema,
  ReviewReportSchema,
  GetReportsSchema,
  GetAnalyticsSchema,
  GetAuditLogsSchema,
  DeleteMessageSchema,
  DeleteConversationSchema,
  SuspendUserDto,
  BanUserDto,
  UpdateUserRoleDto,
  ReviewReportDto,
  GetReportsDto,
  GetAnalyticsDto,
  GetAuditLogsDto,
  DeleteMessageDto,
  DeleteConversationDto,
} from './dto/admin.dto'
import { UserRole } from './interfaces/admin.interface'

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private moderationService: ModerationService,
    private auditService: AuditService,
    private analyticsService: AnalyticsService,
  ) {}

  // User Management Endpoints
  @Get('users')
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: 'active' | 'suspended' | 'banned',
  ) {
    return this.adminService.getUsers(
      parseInt(page),
      parseInt(limit),
      search,
      role,
      status,
    )
  }

  @Get('users/:userId')
  async getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId)
  }

  @Post('users/:userId/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(SuspendUserSchema)) suspendUserDto: SuspendUserDto,
    @Request() req: any,
  ) {
    return this.adminService.suspendUser(
      { ...suspendUserDto, userId },
      req.user.id,
    )
  }

  @Post('users/:userId/unsuspend')
  @HttpCode(HttpStatus.OK)
  async unsuspendUser(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.adminService.unsuspendUser(userId, req.user.id)
  }

  @Post('users/:userId/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(BanUserSchema)) banUserDto: BanUserDto,
    @Request() req: any,
  ) {
    return this.adminService.banUser(
      { ...banUserDto, userId },
      req.user.id,
    )
  }

  @Put('users/:userId/role')
  async updateUserRole(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdateUserRoleSchema)) updateUserRoleDto: UpdateUserRoleDto,
    @Request() req: any,
  ) {
    return this.adminService.updateUserRole(
      { ...updateUserRoleDto, userId },
      req.user.id,
    )
  }

  // Report Management Endpoints
  @Get('reports')
  async getReports(
    @Query(new ZodValidationPipe(GetReportsSchema)) getReportsDto: GetReportsDto,
  ) {
    return this.moderationService.getReports(getReportsDto)
  }

  @Get('reports/:reportId')
  async getReportById(@Param('reportId') reportId: string) {
    return this.moderationService.getReportById(reportId)
  }

  @Get('reports/:reportId/content')
  async getReportedContent(@Param('reportId') reportId: string) {
    return this.moderationService.getReportedContent(reportId)
  }

  @Put('reports/:reportId/review')
  async reviewReport(
    @Param('reportId') reportId: string,
    @Body(new ZodValidationPipe(ReviewReportSchema)) reviewReportDto: ReviewReportDto,
    @Request() req: any,
  ) {
    return this.moderationService.reviewReport(
      { ...reviewReportDto, reportId },
      req.user.id,
    )
  }

  // Content Moderation Endpoints
  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Body(new ZodValidationPipe(DeleteMessageSchema)) deleteMessageDto: DeleteMessageDto,
    @Request() req: any,
  ) {
    return this.moderationService.deleteMessage(
      { ...deleteMessageDto, messageId },
      req.user.id,
    )
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(DeleteConversationSchema)) deleteConversationDto: DeleteConversationDto,
    @Request() req: any,
  ) {
    return this.moderationService.deleteConversation(
      { ...deleteConversationDto, conversationId },
      req.user.id,
    )
  }

  // Analytics Endpoints
  @Get('analytics')
  async getSystemAnalytics(
    @Query(new ZodValidationPipe(GetAnalyticsSchema)) getAnalyticsDto: GetAnalyticsDto,
  ) {
    return this.analyticsService.getSystemAnalytics(getAnalyticsDto)
  }

  @Get('analytics/users')
  async getUserGrowthAnalytics(@Query('days') days: string = '30') {
    return this.analyticsService.getUserGrowthAnalytics(parseInt(days))
  }

  @Get('analytics/messages')
  async getMessageAnalytics(@Query('days') days: string = '30') {
    return this.analyticsService.getMessageAnalytics(parseInt(days))
  }

  @Get('analytics/reports')
  async getReportAnalytics(@Query('days') days: string = '30') {
    return this.analyticsService.getReportAnalytics(parseInt(days))
  }

  // Audit Log Endpoints
  @Get('audit-logs')
  async getAuditLogs(
    @Query(new ZodValidationPipe(GetAuditLogsSchema)) getAuditLogsDto: GetAuditLogsDto,
  ) {
    return this.auditService.getAuditLogs(getAuditLogsDto)
  }

  @Get('audit-logs/:logId')
  async getAuditLogById(@Param('logId') logId: string) {
    return this.auditService.getAuditLogById(logId)
  }

  @Get('audit-logs/admin/:adminId/activity')
  async getAdminActivity(
    @Param('adminId') adminId: string,
    @Query('days') days: string = '30',
  ) {
    return this.auditService.getAdminActivity(adminId, parseInt(days))
  }

  @Get('audit-logs/system/summary')
  async getSystemAuditSummary(@Query('days') days: string = '7') {
    return this.auditService.getSystemAuditSummary(parseInt(days))
  }
}