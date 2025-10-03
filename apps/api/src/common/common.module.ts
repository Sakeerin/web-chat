import { Module, Global } from '@nestjs/common'
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { HttpExceptionFilter } from './filters/http-exception.filter'
import { LoggingInterceptor } from './interceptors/logging.interceptor'
import { TransformInterceptor } from './interceptors/transform.interceptor'
import { SecurityController } from './controllers/security.controller'
import { createThrottlerConfig } from './config/throttle.config'

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot(createThrottlerConfig()),
  ],
  controllers: [SecurityController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [ThrottlerModule],
})
export class CommonModule {}