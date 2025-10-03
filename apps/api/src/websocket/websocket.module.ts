import { Module, forwardRef } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { WebSocketGateway } from './websocket.gateway'
import { WebSocketService } from './websocket.service'
import { PresenceService } from './presence.service'
import { TypingService } from './typing.service'
import { RedisPubSubService } from './redis-pubsub.service'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { ConversationsModule } from '../conversations/conversations.module'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
    AuthModule,
    UsersModule,
    ConversationsModule,
  ],
  providers: [WebSocketGateway, WebSocketService, PresenceService, TypingService, RedisPubSubService],
  exports: [WebSocketService, PresenceService, TypingService, RedisPubSubService],
})
export class WebSocketModule {}