import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { INestApplication } from '@nestjs/common'

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Telegram Web Chat API')
    .setDescription('A fast, secure, and scalable real-time messaging platform API')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and session management')
    .addTag('Users', 'User profile and contact management')
    .addTag('Chat', 'Messaging and conversation management')
    .addTag('Upload', 'File upload and media processing')
    .addTag('Search', 'Search functionality for messages and contacts')
    .addTag('Health', 'Health check endpoints')
    .addServer(process.env.API_URL || 'http://localhost:3001', 'Development server')
    .build()

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  })

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Telegram Web Chat API Documentation',
  })
}