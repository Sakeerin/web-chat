# Search Service Implementation

This module provides comprehensive search functionality for the Telegram-like web chat application using MeiliSearch as the search engine. It supports real-time indexing, advanced filtering, and high-performance search across messages, users, and conversations.

## Features

### Core Search Capabilities
- **Message Search**: Full-text search across message content with highlighting
- **User Search**: Find users by username, name, or bio with privacy controls
- **Conversation Search**: Search conversations by title and member names
- **Search Suggestions**: Real-time search suggestions based on history and contacts

### Advanced Features
- **Real-time Indexing**: Automatic indexing of new content as it's created
- **Access Control**: Search results respect user permissions and privacy settings
- **Performance Optimization**: Sub-300ms search response times (P95)
- **Filtering & Pagination**: Advanced filtering options with cursor-based pagination
- **Result Highlighting**: Search term highlighting in results
- **Bulk Operations**: Efficient bulk indexing for initial setup and re-indexing

## Architecture

### Components

1. **MeiliSearchService**: Low-level MeiliSearch client wrapper
   - Index configuration and management
   - Document indexing and search operations
   - Performance monitoring and statistics

2. **SearchService**: High-level search orchestration
   - Business logic and access control
   - Data transformation and preparation
   - Integration with database and other services

3. **SearchController**: REST API endpoints
   - Input validation and sanitization
   - Response formatting and error handling
   - Authentication and authorization

### Data Flow

```
Client Request → SearchController → SearchService → MeiliSearchService → MeiliSearch
                                        ↓
                                  PrismaService → PostgreSQL
```

## API Endpoints

### Search Operations

#### `GET /search/messages`
Search messages with advanced filtering options.

**Query Parameters:**
- `q` (required): Search query string
- `conversationId` (optional): Limit search to specific conversation
- `limit` (optional): Number of results (1-100, default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `dateFrom` (optional): Search from date (ISO string)
- `dateTo` (optional): Search to date (ISO string)
- `messageTypes` (optional): Comma-separated message types
- `hasAttachments` (optional): Filter by attachment presence

**Example:**
```bash
GET /search/messages?q=hello%20world&conversationId=conv_123&limit=25&hasAttachments=true
```

#### `GET /search/users`
Search users with privacy controls.

**Query Parameters:**
- `q` (required): Search query string
- `limit` (optional): Number of results (1-50, default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `excludeBlocked` (optional): Exclude blocked users (default: true)

#### `GET /search/conversations`
Search conversations user is a member of.

**Query Parameters:**
- `q` (required): Search query string
- `limit` (optional): Number of results (1-50, default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `type` (optional): Filter by conversation type (dm, group, channel)

#### `GET /search/suggestions`
Get search suggestions based on user history.

**Query Parameters:**
- `q` (required): Partial search query
- `limit` (optional): Number of suggestions (1-10, default: 5)

### Management Operations

#### `GET /search/stats`
Get search index statistics and health information.

#### `POST /search/reindex/messages`
Trigger bulk re-indexing of all messages (admin operation).

#### `POST /search/index/message/:messageId`
Index a specific message.

#### `POST /search/index/user/:userId`
Index a specific user.

#### `POST /search/index/conversation/:conversationId`
Index a specific conversation.

## Configuration

### MeiliSearch Setup

The service connects to MeiliSearch using environment variables:

```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=masterKey123
```

### Index Configuration

Three main indexes are configured:

1. **Messages Index** (`messages`)
   - Searchable: content, senderName, senderUsername, attachmentNames
   - Filterable: conversationId, senderId, type, hasAttachments, createdAt, isReply
   - Sortable: createdAt, updatedAt
   - Ranking: words, typo, proximity, attribute, sort, exactness, createdAt:desc

2. **Users Index** (`users`)
   - Searchable: username, name, bio
   - Filterable: isActive, createdAt
   - Sortable: username, name, createdAt

3. **Conversations Index** (`conversations`)
   - Searchable: title, memberNames, memberUsernames
   - Filterable: type, memberIds, createdAt, isActive
   - Sortable: title, createdAt, updatedAt

## Usage Examples

### Basic Message Search

```typescript
import { SearchService } from './search.service'

// Search messages in all user's conversations
const results = await searchService.searchMessages({
  query: 'project deadline',
  userId: 'user_123',
  limit: 50,
})

// Search in specific conversation with date range
const filteredResults = await searchService.searchMessages({
  query: 'meeting notes',
  userId: 'user_123',
  conversationId: 'conv_456',
  dateFrom: new Date('2023-01-01'),
  dateTo: new Date('2023-12-31'),
  messageTypes: ['text'],
})
```

### User Discovery

```typescript
// Search for users to add as contacts
const users = await searchService.searchUsers({
  query: 'john doe',
  currentUserId: 'user_123',
  excludeBlocked: true,
  limit: 20,
})
```

### Real-time Indexing

```typescript
// Index new message immediately after creation
await searchService.indexMessage(newMessage.id)

// Update message index after edit
await searchService.updateMessageIndex(editedMessage.id)

// Remove message from index after deletion
await searchService.removeMessageFromIndex(deletedMessage.id)
```

## Performance Considerations

### Search Performance
- Target P95 response time: < 300ms
- MeiliSearch processing time typically < 50ms
- Database access optimized with proper indexes
- Connection pooling for database queries

### Indexing Performance
- Bulk indexing processes 1000 documents per batch
- Real-time indexing has minimal latency impact
- Background re-indexing for maintenance operations
- Automatic retry logic for failed indexing operations

### Memory and Storage
- MeiliSearch indexes stored on disk with memory caching
- Document size optimized (content cropped, metadata minimized)
- Regular index maintenance and cleanup
- Monitoring for index size and performance metrics

## Security and Privacy

### Access Control
- Users can only search in conversations they're members of
- Blocked users are excluded from search results
- Private user information respects privacy settings
- Admin operations require proper authorization

### Data Protection
- Search indexes contain only necessary data
- Sensitive information is not indexed
- Regular security audits of indexed content
- Compliance with data retention policies

## Monitoring and Maintenance

### Health Checks
- MeiliSearch connection status
- Index health and statistics
- Search performance metrics
- Error rate monitoring

### Maintenance Operations
- Bulk re-indexing for schema changes
- Index optimization and cleanup
- Performance tuning and configuration updates
- Backup and recovery procedures

## Testing

### Unit Tests
- Service method functionality
- Input validation and sanitization
- Error handling and edge cases
- Mock external dependencies

### Integration Tests
- End-to-end search workflows
- Database integration
- MeiliSearch integration
- API endpoint testing

### Performance Tests
- Search response time benchmarks
- Concurrent user load testing
- Indexing performance validation
- Memory and resource usage

## Troubleshooting

### Common Issues

1. **Slow Search Performance**
   - Check MeiliSearch server resources
   - Verify index configuration and size
   - Monitor database query performance
   - Review search query complexity

2. **Missing Search Results**
   - Verify user has access to conversations
   - Check if content is properly indexed
   - Validate search filters and parameters
   - Review privacy settings and blocked users

3. **Indexing Failures**
   - Check MeiliSearch server connectivity
   - Verify document format and size
   - Monitor error logs for specific failures
   - Ensure proper error handling and retries

### Debug Commands

```bash
# Check search service health
curl http://localhost:3000/search/stats

# Test message search
curl "http://localhost:3000/search/messages?q=test" \
  -H "Authorization: Bearer <token>"

# Trigger re-indexing
curl -X POST http://localhost:3000/search/reindex/messages \
  -H "Authorization: Bearer <token>"
```

## Future Enhancements

### Planned Features
- Semantic search using vector embeddings
- Advanced search operators and syntax
- Search analytics and usage metrics
- Multi-language search support
- Search result ranking personalization

### Performance Improvements
- Search result caching
- Predictive search and pre-loading
- Advanced indexing strategies
- Real-time search suggestions
- Search performance optimization

This search implementation provides a solid foundation for the chat application's search requirements while maintaining high performance, security, and scalability standards.