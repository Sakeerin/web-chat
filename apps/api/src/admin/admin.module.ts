import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { ModerationService } from './moderation.service'
import { AuditService } from './audit.service'
import { AnalyticsService } from './analytics.service'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController],
  providers: [AdminService, ModerationService, AuditService, AnalyticsService],
  exports: [AdminService, ModerationService, AuditService, AnalyticsService],
})
export class AdminModule {}