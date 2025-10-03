import { Controller, Get, Query, UseGuards, Request, Post, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SearchService, MessageSearchOptions, UserSearchOptions, ConversationSearchOptions } from './search.service'
import { z } from 'zod'

// Validation schemas
const MessageSearchSchema = z.object({
  q: z.string().min(1).max(200),
  conversationId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  messageTypes: z.string().optional(), // comma-separated
  hasAttachments: z.coerce.boolean().optional(),
})

const UserSearchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  excludeBlocked: z.coerce.boolean().default(true),
})

const ConversationSearchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(['dm', 'group', 'channel']).optional(),
})

const SuggestionsSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(10).default(5),
})

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('messages')
  @ApiOperation({ summary: 'Search messages' })
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 403, description: 'Access denied to conversation' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'conversationId', description: 'Limit search to specific conversation', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of results to return (1-100)', required: false })
  @ApiQuery({ name: 'offset', description: 'Number of results to skip', required: false })
  @ApiQuery({ name: 'dateFrom', description: 'Search from date (ISO string)', required: false })
  @ApiQuery({ name: 'dateTo', description: 'Search to date (ISO string)', required: false })
  @ApiQuery({ name: 'messageTypes', description: 'Comma-separated message types', required: false })
  @ApiQuery({ name: 'hasAttachments', description: 'Filter by attachment presence', required: false })
  async searchMessages(@Query() query: any, @Request() req: any) {
    const validatedQuery = MessageSearchSchema.parse(query)
    
    const options: MessageSearchOptions = {
      query: validatedQuery.q,
      userId: req.user.id,
      conversationId: validatedQuery.conversationId,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      dateFrom: validatedQuery.dateFrom ? new Date(validatedQuery.dateFrom) : undefined,
      dateTo: validatedQuery.dateTo ? new Date(validatedQuery.dateTo) : undefined,
      messageTypes: validatedQuery.messageTypes ? validatedQuery.messageTypes.split(',') : undefined,
      hasAttachments: validatedQuery.hasAttachments,
    }

    return await this.searchService.searchMessages(options)
  }

  @Get('users')
  @ApiOperation({ summary: 'Search users/contacts' })
  @ApiResponse({ status: 200, description: 'User search results returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'limit', description: 'Number of results to return (1-50)', required: false })
  @ApiQuery({ name: 'offset', description: 'Number of results to skip', required: false })
  @ApiQuery({ name: 'excludeBlocked', description: 'Exclude blocked users', required: false })
  async searchUsers(@Query() query: any, @Request() req: any) {
    const validatedQuery = UserSearchSchema.parse(query)
    
    const options: UserSearchOptions = {
      query: validatedQuery.q,
      currentUserId: req.user.id,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      excludeBlocked: validatedQuery.excludeBlocked,
    }

    return await this.searchService.searchUsers(options)
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Search conversations' })
  @ApiResponse({ status: 200, description: 'Conversation search results returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'limit', description: 'Number of results to return (1-50)', required: false })
  @ApiQuery({ name: 'offset', description: 'Number of results to skip', required: false })
  @ApiQuery({ name: 'type', description: 'Filter by conversation type', required: false })
  async searchConversations(@Query() query: any, @Request() req: any) {
    const validatedQuery = ConversationSearchSchema.parse(query)
    
    const options: ConversationSearchOptions = {
      query: validatedQuery.q,
      userId: req.user.id,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      conversationType: validatedQuery.type,
    }

    return await this.searchService.searchConversations(options)
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({ status: 200, description: 'Search suggestions returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiQuery({ name: 'q', description: 'Partial search query', required: true })
  @ApiQuery({ name: 'limit', description: 'Number of suggestions to return (1-10)', required: false })
  async getSearchSuggestions(@Query() query: any, @Request() req: any) {
    const validatedQuery = SuggestionsSchema.parse(query)
    
    return await this.searchService.getSearchSuggestions(
      req.user.id,
      validatedQuery.q,
      validatedQuery.limit
    )
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get search index statistics' })
  @ApiResponse({ status: 200, description: 'Search statistics returned successfully' })
  async getSearchStats() {
    return await this.searchService.getSearchStats()
  }

  @Post('reindex/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger message re-indexing (admin only)' })
  @ApiResponse({ status: 202, description: 'Re-indexing started' })
  async reindexMessages(@Request() req: any) {
    // Note: In a real implementation, you'd want to check for admin permissions here
    // For now, we'll allow any authenticated user to trigger re-indexing
    
    // Run re-indexing in background
    this.searchService.bulkIndexMessages().catch(error => {
      console.error('Background re-indexing failed:', error)
    })

    return { message: 'Message re-indexing started' }
  }

  @Post('index/message/:messageId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Index a specific message' })
  @ApiResponse({ status: 202, description: 'Message indexing started' })
  async indexMessage(@Param('messageId') messageId: string) {
    await this.searchService.indexMessage(messageId)
    return { message: 'Message indexed successfully' }
  }

  @Post('index/user/:userId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Index a specific user' })
  @ApiResponse({ status: 202, description: 'User indexing started' })
  async indexUser(@Param('userId') userId: string) {
    await this.searchService.indexUser(userId)
    return { message: 'User indexed successfully' }
  }

  @Post('index/conversation/:conversationId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Index a specific conversation' })
  @ApiResponse({ status: 202, description: 'Conversation indexing started' })
  async indexConversation(@Param('conversationId') conversationId: string) {
    await this.searchService.indexConversation(conversationId)
    return { message: 'Conversation indexed successfully' }
  }
}