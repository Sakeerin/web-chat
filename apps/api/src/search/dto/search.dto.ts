import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsDateString, Min, Max, Length } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class MessageSearchDto {
  @ApiProperty({ description: 'Search query', example: 'hello world' })
  @IsString()
  @Length(1, 200)
  q: string

  @ApiPropertyOptional({ description: 'Limit search to specific conversation' })
  @IsOptional()
  @IsString()
  conversationId?: string

  @ApiPropertyOptional({ description: 'Number of results to return', minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50

  @ApiPropertyOptional({ description: 'Number of results to skip', minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0

  @ApiPropertyOptional({ description: 'Search from date (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @ApiPropertyOptional({ description: 'Search to date (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string

  @ApiPropertyOptional({ description: 'Comma-separated message types', example: 'text,image' })
  @IsOptional()
  @IsString()
  messageTypes?: string

  @ApiPropertyOptional({ description: 'Filter by attachment presence' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasAttachments?: boolean
}

export class UserSearchDto {
  @ApiProperty({ description: 'Search query', example: 'john' })
  @IsString()
  @Length(1, 100)
  q: string

  @ApiPropertyOptional({ description: 'Number of results to return', minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20

  @ApiPropertyOptional({ description: 'Number of results to skip', minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0

  @ApiPropertyOptional({ description: 'Exclude blocked users', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeBlocked?: boolean = true
}

export class ConversationSearchDto {
  @ApiProperty({ description: 'Search query', example: 'project team' })
  @IsString()
  @Length(1, 100)
  q: string

  @ApiPropertyOptional({ description: 'Number of results to return', minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20

  @ApiPropertyOptional({ description: 'Number of results to skip', minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0

  @ApiPropertyOptional({ description: 'Filter by conversation type' })
  @IsOptional()
  @IsEnum(['dm', 'group', 'channel'])
  type?: 'dm' | 'group' | 'channel'
}

export class SearchSuggestionsDto {
  @ApiProperty({ description: 'Partial search query', example: 'hel' })
  @IsString()
  @Length(1, 100)
  q: string

  @ApiPropertyOptional({ description: 'Number of suggestions to return', minimum: 1, maximum: 10, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number = 5
}

export class SearchResultDto<T = any> {
  @ApiProperty({ description: 'Search results' })
  hits: T[]

  @ApiProperty({ description: 'Original search query' })
  query: string

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs: number

  @ApiProperty({ description: 'Number of results returned' })
  limit: number

  @ApiProperty({ description: 'Number of results skipped' })
  offset: number

  @ApiProperty({ description: 'Estimated total number of matching results' })
  estimatedTotalHits: number
}

export class MessageSearchResultDto {
  @ApiProperty({ description: 'Message ID' })
  id: string

  @ApiProperty({ description: 'Conversation ID' })
  conversationId: string

  @ApiProperty({ description: 'Sender ID' })
  senderId: string

  @ApiProperty({ description: 'Sender name' })
  senderName: string

  @ApiProperty({ description: 'Sender username' })
  senderUsername: string

  @ApiProperty({ description: 'Message content with highlighting' })
  content: string

  @ApiProperty({ description: 'Message type' })
  type: string

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: number

  @ApiProperty({ description: 'Whether message has attachments' })
  hasAttachments: boolean

  @ApiProperty({ description: 'Attachment MIME types' })
  attachmentTypes: string[]

  @ApiProperty({ description: 'Whether message is a reply' })
  isReply: boolean

  @ApiPropertyOptional({ description: 'Content of replied-to message' })
  replyToContent?: string

  @ApiPropertyOptional({ description: 'Highlighted content snippets' })
  _formatted?: {
    content?: string
    senderName?: string
  }
}

export class UserSearchResultDto {
  @ApiProperty({ description: 'User ID' })
  id: string

  @ApiProperty({ description: 'Username' })
  username: string

  @ApiProperty({ description: 'Display name' })
  name: string

  @ApiPropertyOptional({ description: 'User bio' })
  bio?: string

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: number

  @ApiProperty({ description: 'Whether user is active' })
  isActive: boolean

  @ApiPropertyOptional({ description: 'Highlighted content snippets' })
  _formatted?: {
    username?: string
    name?: string
    bio?: string
  }
}

export class ConversationSearchResultDto {
  @ApiProperty({ description: 'Conversation ID' })
  id: string

  @ApiProperty({ description: 'Conversation type' })
  type: string

  @ApiPropertyOptional({ description: 'Conversation title' })
  title?: string

  @ApiProperty({ description: 'Member user IDs' })
  memberIds: string[]

  @ApiProperty({ description: 'Member names (space-separated)' })
  memberNames: string

  @ApiProperty({ description: 'Member usernames (space-separated)' })
  memberUsernames: string

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: number

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: number

  @ApiPropertyOptional({ description: 'Highlighted content snippets' })
  _formatted?: {
    title?: string
    memberNames?: string
  }
}

export class SearchSuggestionDto {
  @ApiProperty({ description: 'Suggested text' })
  text: string

  @ApiProperty({ description: 'Suggestion type', enum: ['recent', 'popular', 'contact'] })
  type: 'recent' | 'popular' | 'contact'

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>
}

export class SearchStatsDto {
  @ApiProperty({ description: 'Messages index statistics' })
  messages: {
    numberOfDocuments: number
    isIndexing: boolean
    fieldDistribution: Record<string, number>
  }

  @ApiProperty({ description: 'Users index statistics' })
  users: {
    numberOfDocuments: number
    isIndexing: boolean
    fieldDistribution: Record<string, number>
  }

  @ApiProperty({ description: 'Conversations index statistics' })
  conversations: {
    numberOfDocuments: number
    isIndexing: boolean
    fieldDistribution: Record<string, number>
  }
}