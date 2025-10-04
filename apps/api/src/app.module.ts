import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { RedisModule } from '@nestjs-modules/ioredis'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CommonModule } from './common/common.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ConversationsModule } from './conversations/conversations.module'
import { MessagesModule } from './messages/messages.module'
import { WebSocketModule } from './websocket/websocket.module'
import { SearchModule } from './search/search.module'
import { AdminModule } from './admin/admin.module'
import { PerformanceModule } from './monitoring/performance.module'

// Security components
import { SecurityMiddleware } from './common/middleware/security.middleware'
import { CsrfMiddleware } from './common/middleware/csrf.middleware'
import { RateLimitGuard } from './common/guards/rate-limit.guard'
import { SecurityInterceptor } from './common/interceptors/security.interceptor'
import { SanitizationPipe } from './common/pipes/sanitization.pipe'
import { SecurityAuditService } from './common/services/security-audit.service'

// Performance monitoring
import { PerformanceMiddleware } from './monitoring/performance.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get('REDIS_URL') || 'redis://localhost:6379',
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    WebSocketModule,
    SearchModule,
    AdminModule,
    PerformanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SecurityAuditService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityInterceptor,
    },
    {
      provide: APP_PIPE,
      useClass: SanitizationPipe,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware, CsrfMiddleware, PerformanceMiddleware)
      .forRoutes('*');
  }
}