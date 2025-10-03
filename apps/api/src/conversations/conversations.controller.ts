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
import { ConversationsService } from './conversations.service'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { UpdateConversationDto } from './dto/update-conversation.dto'
import { AddMemberDto } from './dto/add-member.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { ConversationQueryDto } from './dto/conversation-query.dto'

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  /**
   * Create a new conversation
   */
  @Post()
  async createConversation(@Request() req: any, @Body() createDto: CreateConversationDto) {
    return this.conversationsService.createConversation(req.user.id, createDto)
  }

  /**
   * Get user's conversations with pagination
   */
  @Get()
  async getConversations(@Request() req: any, @Query() query: ConversationQueryDto) {
    return this.conversationsService.getConversations(req.user.id, query)
  }

  /**
   * Search conversations
   */
  @Get('search')
  async searchConversations(@Request() req: any, @Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return { conversations: [], total: 0, hasMore: false }
    }
    return this.conversationsService.searchConversations(req.user.id, query.trim())
  }

  /**
   * Get a specific conversation
   */
  @Get(':id')
  async getConversation(@Request() req: any, @Param('id') conversationId: string) {
    return this.conversationsService.getConversationById(req.user.id, conversationId)
  }

  /**
   * Update conversation metadata
   */
  @Put(':id')
  async updateConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() updateDto: UpdateConversationDto,
  ) {
    return this.conversationsService.updateConversation(req.user.id, conversationId, updateDto)
  }

  /**
   * Add a member to the conversation
   */
  @Post(':id/members')
  async addMember(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.conversationsService.addMember(req.user.id, conversationId, addMemberDto)
  }

  /**
   * Update a member's role or settings
   */
  @Put(':id/members/:userId')
  async updateMember(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Param('userId') memberUserId: string,
    @Body() updateDto: UpdateMemberDto,
  ) {
    return this.conversationsService.updateMember(req.user.id, conversationId, memberUserId, updateDto)
  }

  /**
   * Remove a member from the conversation
   */
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Param('userId') memberUserId: string,
  ) {
    return this.conversationsService.removeMember(req.user.id, conversationId, memberUserId)
  }

  /**
   * Leave a conversation
   */
  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveConversation(@Request() req: any, @Param('id') conversationId: string) {
    return this.conversationsService.leaveConversation(req.user.id, conversationId)
  }
}