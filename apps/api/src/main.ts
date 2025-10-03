import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { setupSwagger } from './common/config/swagger.config'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const logger = new Logger('Bootstrap')
  
  // Enable CORS for development
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  
  // Setup Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app)
    logger.log('📚 Swagger documentation available at /api/docs')
  }
  
  // Security headers
  app.use((req: any, res: any, next: any) => {
    res.header('X-Content-Type-Options', 'nosniff')
    res.header('X-Frame-Options', 'DENY')
    res.header('X-XSS-Protection', '1; mode=block')
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    next()
  })
  
  const port = process.env.PORT || 3001
  await app.listen(port)
  
  logger.log(`🚀 API server running on http://localhost:${port}`)
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📚 API documentation: http://localhost:${port}/api/docs`)
  }
}

bootstrap()