import { Module, forwardRef } from '@nestjs/common'
import { MessagesService } from './messages.service'
import { MessagesController } from './messages.controller'
import { MessageSearchService } from './search/message-search.service'
import { MessageDeliveryService } from './delivery/message-delivery.service'
import { DatabaseModule } from '../database/database.module'
import { WebSocketModule } from '../websocket/websocket.module'
import { SearchModule } from '../search/search.module'

@Module({
  imports: [DatabaseModule, forwardRef(() => WebSocketModule), SearchModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessageSearchService, MessageDeliveryService],
  exports: [MessagesService, MessageSearchService, MessageDeliveryService],
})
export class MessagesModule {}