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
import { MessagesService } from './messages.service'
import { CreateMessageDto } from './dto/create-message.dto'
import { UpdateMessageDto } from './dto/update-message.dto'
import { GetMessagesDto } from './dto/get-messages.dto'
import { 
  MessageWithRelations, 
  MessageListResponse, 
  MessageEditHistory,
  MessageSearchResult 
} from './interfaces/message.interface'

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async createMessage(
    @Body() createMessageDto: CreateMessageDto & { tempId?: string },
    @Request() req: any,
  ): Promise<{ message: MessageWithRelations; deliveryState?: any }> {
    if (createMessageDto.tempId) {
      // Use delivery service for messages with tempId
      return this.messagesService.createMessageWithDelivery(
        {
          ...createMessageDto,
          senderId: req.user.id,
        },
        createMessageDto.tempId,
      )
    } else {
      // Fallback to regular creation
      const message = await this.messagesService.createMessage({
        ...createMessageDto,
        senderId: req.user.id,
      })
      return { message }
    }
  }

  @Get('conversation/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesDto,
    @Request() req: any,
  ): Promise<MessageListResponse> {
    return this.messagesService.getMessages(conversationId, req.user.id, query)
  }

  @Get('conversation/:conversationId/search')
  async searchMessages(
    @Param('conversationId') conversationId: string,
    @Query('q') query: string,
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<MessageSearchResult> {
    return this.messagesService.searchMessages(
      conversationId,
      req.user.id,
      query,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    )
  }

  @Get('search')
  async searchAllMessages(
    @Query('q') query: string,
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('types') types?: string,
  ): Promise<MessageSearchResult> {
    const options: any = {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    }

    if (dateFrom) options.dateFrom = new Date(dateFrom)
    if (dateTo) options.dateTo = new Date(dateTo)
    if (types) options.messageTypes = types.split(',')

    return this.messagesService.searchAllMessages(req.user.id, query, options)
  }

  @Get('search/suggestions')
  async getSearchSuggestions(
    @Query('q') partialQuery: string,
    @Request() req: any,
  ): Promise<{ suggestions: string[] }> {
    const suggestions = await this.messagesService.getSearchSuggestions(req.user.id, partialQuery)
    return { suggestions }
  }

  @Get('conversation/:conversationId/unread-count')
  async getUnreadCount(
    @Param('conversationId') conversationId: string,
    @Request() req: any,
  ): Promise<{ count: number }> {
    const count = await this.messagesService.getUnreadCount(conversationId, req.user.id)
    return { count }
  }

  @Get(':id')
  async getMessage(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<MessageWithRelations> {
    return this.messagesService.getMessage(id, req.user.id)
  }

  @Get(':id/edit-history')
  async getMessageEditHistory(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<MessageEditHistory[]> {
    return this.messagesService.getMessageEditHistory(id, req.user.id)
  }

  @Put(':id')
  async editMessage(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Request() req: any,
  ): Promise<MessageWithRelations> {
    return this.messagesService.editMessage(id, req.user.id, updateMessageDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    return this.messagesService.deleteMessage(id, req.user.id)
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Param('id') messageId: string,
    @Body('conversationId') conversationId: string,
    @Request() req: any,
  ): Promise<void> {
    // Use delivery service for read receipts
    await this.messagesService.messageDeliveryService.markMessageAsRead(
      messageId,
      req.user.id,
      conversationId,
    )
  }

  @Get(':id/delivery-state')
  async getDeliveryState(
    @Param('id') messageId: string,
    @Request() req: any,
  ): Promise<any> {
    return this.messagesService.messageDeliveryService.getMessageDeliveryState(
      messageId,
      req.user.id,
    )
  }

  @Post('conversation/:conversationId/backfill')
  async backfillMessages(
    @Param('conversationId') conversationId: string,
    @Body('lastMessageId') lastMessageId: string | undefined,
    @Request() req: any,
  ): Promise<{ messages: any[] }> {
    const messages = await this.messagesService.messageDeliveryService.backfillMessages(
      req.user.id,
      conversationId,
      lastMessageId,
    )
    return { messages }
  }
}