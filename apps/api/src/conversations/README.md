# Conversation Management Service

This module implements comprehensive conversation management functionality for the Telegram-like web chat application, supporting both direct messages (DMs) and group conversations with advanced member management capabilities.

## Features

### Core Conversation Operations
- **Create Conversations**: Support for DM and group chat creation with validation
- **List Conversations**: Paginated conversation listing with last message preview and unread counts
- **Search Conversations**: Full-text search across conversation titles, descriptions, and member names
- **Update Metadata**: Modify conversation titles, descriptions, avatars, and settings

### Member Management
- **Add Members**: Add users to group conversations with role assignment
- **Remove Members**: Remove members with proper permission checks
- **Update Roles**: Change member roles (Owner, Admin, Moderator, Member)
- **Leave Conversations**: Allow users to leave with automatic ownership transfer

### Advanced Features
- **Unread Counts**: Real-time tracking of unread messages per conversation
- **Privacy Controls**: Blocked user prevention and contact validation
- **Permission System**: Role-based access control for conversation operations
- **Ownership Transfer**: Automatic ownership transfer when owners leave groups

## API Endpoints

### Conversation CRUD
```
POST   /conversations              # Create new conversation
GET    /conversations              # List user's conversations (paginated)
GET    /conversations/:id          # Get specific conversation details
PUT    /conversations/:id          # Update conversation metadata
```

### Member Management
```
POST   /conversations/:id/members           # Add member to conversation
PUT    /conversations/:id/members/:userId   # Update member role/settings
DELETE /conversations/:id/members/:userId   # Remove member from conversation
POST   /conversations/:id/leave             # Leave conversation
```

### Search
```
GET    /conversations/search?q=query        # Search conversations
```

## Data Models

### Conversation Types
- **DM**: Direct message between two users
- **GROUP**: Group chat with multiple members and roles
- **CHANNEL**: Broadcast channel (future implementation)

### Member Roles
- **OWNER**: Full control, can transfer ownership
- **ADMIN**: Can manage members and settings
- **MODERATOR**: Can moderate content (future implementation)
- **MEMBER**: Basic participation rights

### Conversation Structure
```typescript
interface ConversationWithMembers {
  id: string
  type: ConversationType
  title?: string
  description?: string
  avatarUrl?: string
  ownerId?: string
  isArchived: boolean
  settings: Record<string, any>
  createdAt: Date
  updatedAt: Date
  members: ConversationMemberInfo[]
  lastMessage?: LastMessageInfo
  unreadCount?: number
}
```

## Business Rules

### DM Conversations
- Must have exactly one other participant
- Cannot add additional members
- No ownership concept (both users are equal)
- Automatically created if doesn't exist

### Group Conversations
- Must have a title
- Support up to 500 members (MVP limit)
- Owner can transfer ownership or delete group
- Admins can manage members and settings
- Automatic ownership transfer when owner leaves

### Permission Matrix
| Action | Owner | Admin | Moderator | Member |
|--------|-------|-------|-----------|--------|
| Update metadata | ✓ | ✓ | ✗ | ✗ |
| Add members | ✓ | ✓ | ✗ | ✗ |
| Remove members | ✓ | ✓ | ✗ | ✗ |
| Change roles | ✓ | ✓* | ✗ | ✗ |
| Leave group | ✓** | ✓ | ✓ | ✓ |

*Admins cannot change owner role
**Owner leaving triggers ownership transfer

## Security Features

### Access Control
- JWT authentication required for all endpoints
- Users can only access conversations they're members of
- Role-based permissions for administrative actions

### Blocked User Prevention
- Cannot create conversations with blocked users
- Cannot add blocked users to existing conversations
- Automatic validation during member operations

### Data Validation
- Input sanitization and validation using class-validator
- Proper error handling with descriptive messages
- Rate limiting protection (implemented at gateway level)

## Performance Optimizations

### Database Queries
- Efficient joins with proper indexing
- Cursor-based pagination for large conversation lists
- Optimized unread count calculations
- Selective field loading to reduce payload size

### Caching Strategy
- Conversation metadata caching
- Member list caching for frequently accessed groups
- Unread count caching with invalidation

### Pagination
- Cursor-based pagination for consistent results
- Configurable page sizes (1-100 items)
- Efficient "has more" detection

## Error Handling

### Common Error Scenarios
- **404 Not Found**: Conversation doesn't exist or user not a member
- **403 Forbidden**: Insufficient permissions for operation
- **400 Bad Request**: Invalid input data or business rule violation
- **409 Conflict**: Attempting to add existing member

### Error Response Format
```typescript
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You don't have permission to perform this action",
    "details": { "requiredRole": "ADMIN" }
  }
}
```

## Testing

### Unit Tests
- Service method testing with mocked dependencies
- Business logic validation
- Error condition testing
- Edge case handling

### Integration Tests
- Full API endpoint testing
- Database transaction testing
- Authentication and authorization testing
- Cross-module interaction testing

### Test Coverage
- 90%+ code coverage requirement
- Critical path testing for all conversation operations
- Performance testing for large member lists

## Usage Examples

### Create DM Conversation
```typescript
POST /conversations
{
  "type": "DM",
  "participantIds": ["user123"]
}
```

### Create Group Conversation
```typescript
POST /conversations
{
  "type": "GROUP",
  "title": "Project Team",
  "description": "Team collaboration space",
  "participantIds": ["user123", "user456"]
}
```

### Add Member with Role
```typescript
POST /conversations/conv123/members
{
  "userId": "user789",
  "role": "ADMIN"
}
```

### Search Conversations
```typescript
GET /conversations/search?q=project&limit=10
```

## Future Enhancements

### Planned Features
- **Message Threading**: Reply chains within conversations
- **Conversation Templates**: Predefined group structures
- **Advanced Permissions**: Granular permission system
- **Conversation Analytics**: Usage statistics and insights

### Performance Improvements
- **Sharding**: Conversation partitioning for scale
- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Caching**: Multi-level caching strategy
- **Search Optimization**: Elasticsearch integration

## Dependencies

### Core Dependencies
- **NestJS**: Framework and dependency injection
- **Prisma**: Database ORM and query builder
- **class-validator**: Input validation and sanitization
- **class-transformer**: Data transformation utilities

### Database Requirements
- **PostgreSQL**: Primary data storage
- **Proper Indexing**: Performance optimization
- **Foreign Key Constraints**: Data integrity

## Monitoring and Observability

### Metrics to Track
- Conversation creation rate
- Member addition/removal frequency
- Search query performance
- Error rates by endpoint

### Logging
- Structured logging for all operations
- Security event logging
- Performance metrics logging
- Error tracking with context

This conversation management service provides a robust foundation for real-time messaging with comprehensive member management, security controls, and performance optimizations suitable for high-scale deployment.