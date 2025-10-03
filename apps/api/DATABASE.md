# Database Schema Documentation

## Overview

This document describes the PostgreSQL database schema for the Telegram-like web chat application. The schema is designed for high performance, scalability, and supports all core features including real-time messaging, user management, file attachments, and administrative functions.

## Schema Design Principles

- **Performance-first**: Optimized indexes for common query patterns
- **Scalability**: Designed for horizontal scaling with proper partitioning strategies
- **Data integrity**: Comprehensive foreign key constraints and validation
- **Audit trail**: Complete tracking of user actions and system events
- **Privacy-aware**: Built-in privacy controls and user preferences

## Core Entities

### Users (`users`)

Primary entity for user accounts and authentication.

**Key Features:**
- Unique username and email constraints
- Argon2id password hashing with salts
- Privacy settings stored as JSON
- Account status tracking (active, verified, suspended)
- Last seen tracking for presence

**Performance Indexes:**
- `username` - Fast username lookups and uniqueness
- `email` - Fast email lookups and uniqueness  
- `phone` - Optional phone number lookups
- `(isActive, isSuspended)` - Efficient user status filtering

### Conversations (`conversations`)

Represents chat rooms (DMs, groups, channels).

**Key Features:**
- Support for DM, GROUP, and CHANNEL types
- Optional owner for group management
- JSON settings for conversation preferences
- Archive functionality

**Performance Indexes:**
- `type` - Filter conversations by type
- `ownerId` - Find conversations owned by user
- `createdAt`, `updatedAt` - Temporal sorting

### Messages (`messages`)

Core messaging entity with rich content support.

**Key Features:**
- CUID IDs for time-ordered message IDs
- Support for text, media, and system messages
- Reply threading with `replyToId`
- Edit tracking with history
- Soft delete with tombstone records

**Critical Performance Index:**
- `(conversationId, createdAt)` - **Primary query pattern** for message retrieval
- `senderId` - Messages by user
- `type` - Filter by message type
- `isDeleted` - Exclude deleted messages
- `replyToId` - Thread navigation

### Conversation Members (`conversation_members`)

Junction table managing conversation membership and permissions.

**Key Features:**
- Role-based permissions (OWNER, ADMIN, MODERATOR, MEMBER)
- Join/leave tracking
- Mute functionality with expiration
- Last read message tracking for unread counts

**Performance Indexes:**
- `(conversationId, isActive)` - Active members in conversation
- `(userId, isActive)` - User's active conversations
- `(conversationId, lastReadAt)` - Unread message calculations

### Attachments (`attachments`)

File and media attachments linked to messages.

**Key Features:**
- S3 object key storage
- Media metadata (dimensions, duration)
- Thumbnail generation tracking
- Virus scanning status
- Processing pipeline status

**Performance Indexes:**
- `messageId` - Files for a message
- `objectKey` - Unique S3 object lookup
- `mimeType` - Filter by file type
- `isProcessed`, `isScanned` - Processing status

## Supporting Entities

### User Sessions (`user_sessions`)

Multi-device session management.

**Features:**
- Device identification and tracking
- Refresh token rotation
- Session expiration and cleanup
- IP and user agent logging

### Message Receipts (`message_receipts`)

Delivery and read receipt tracking.

**Features:**
- DELIVERED and READ receipt types
- Unique constraint prevents duplicate receipts
- Timestamp tracking for delivery analytics

### Contact Management

**Contact Requests (`contact_requests`):**
- Username-based contact discovery
- Request/accept/decline workflow
- Blocking integration

**Blocked Users (`blocked_users`):**
- User blocking with reason tracking
- Prevents all communication

### Administrative Features

**User Reports (`user_reports`):**
- Content and user reporting system
- Admin review workflow
- Resolution tracking

**Audit Logs (`audit_logs`):**
- Complete admin action tracking
- Resource-based logging
- Immutable audit trail

## Performance Optimizations

### Query Patterns

The schema is optimized for these primary query patterns:

1. **Message Retrieval**: `(conversationId, createdAt DESC)` - Most frequent query
2. **User Lookup**: `username` and `email` - Authentication and search
3. **Conversation Listing**: `(userId, updatedAt DESC)` - User's conversation list
4. **Unread Counts**: `(conversationId, lastReadAt)` - Unread message calculation

### Scaling Strategies

**Horizontal Scaling:**
- Messages table ready for partitioning by `conversationId` hash
- Read replicas for query distribution
- Separate hot/cold storage for message archival

**Caching Layers:**
- User profiles and settings
- Conversation metadata
- Recent message lists
- Search results

### Index Strategy

All indexes are carefully designed to support specific query patterns:

```sql
-- Critical performance indexes
CREATE INDEX messages_conversationId_createdAt_idx ON messages(conversationId, createdAt DESC);
CREATE INDEX users_username_idx ON users(username);
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX conversation_members_userId_isActive_idx ON conversation_members(userId, isActive);
```

## Data Types and Constraints

### JSON Fields

Several entities use JSON for flexible schema evolution:

- `users.privacySettings` - User privacy preferences
- `conversations.settings` - Conversation-specific settings  
- `messages.metadata` - Rich message metadata
- `conversation_members.permissions` - Granular permissions
- `audit_logs.details` - Flexible audit data

### Enums

Type safety through PostgreSQL enums:

- `ConversationType`: DM, GROUP, CHANNEL
- `ConversationMemberRole`: OWNER, ADMIN, MODERATOR, MEMBER
- `MessageType`: TEXT, IMAGE, VIDEO, AUDIO, FILE, SYSTEM
- `ReceiptType`: DELIVERED, READ
- `ContactRequestStatus`: PENDING, ACCEPTED, DECLINED, BLOCKED
- `ReportStatus`: PENDING, UNDER_REVIEW, RESOLVED, DISMISSED

## Migration Strategy

### Initial Setup

```bash
# Generate Prisma client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Validate schema
npm run db:validate
```

### Production Considerations

- **Zero-downtime migrations**: Use `prisma migrate deploy` in production
- **Backup strategy**: Full backups before schema changes
- **Index creation**: Create indexes `CONCURRENTLY` in production
- **Partitioning**: Implement message table partitioning as data grows

## Security Considerations

### Data Protection

- **Password Security**: Argon2id hashing with unique salts per user
- **Soft Deletes**: Deleted messages retained for audit/recovery
- **Cascade Deletes**: Proper cleanup when users/conversations are deleted
- **Foreign Key Constraints**: Data integrity enforcement

### Privacy Controls

- **User Privacy**: JSON-based privacy settings for granular control
- **Message Encryption**: Schema ready for encrypted message content
- **Audit Trail**: Complete tracking of administrative actions
- **Data Retention**: Configurable retention policies

## Monitoring and Maintenance

### Health Checks

```sql
-- Check database connectivity
SELECT 1 as health_check;

-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;
```

### Performance Monitoring

Key metrics to monitor:

- **Query Performance**: Slow query log analysis
- **Index Usage**: pg_stat_user_indexes monitoring
- **Connection Pool**: Active connections and wait times
- **Replication Lag**: Read replica synchronization
- **Table Growth**: Message and attachment table sizes

## Development Workflow

### Schema Changes

1. **Update Prisma Schema**: Modify `prisma/schema.prisma`
2. **Generate Migration**: `npm run db:migrate`
3. **Update Seed Data**: Modify `prisma/seed.ts` if needed
4. **Validate Changes**: `npm run db:validate`
5. **Update Documentation**: Update this file and API docs

### Testing

- **Unit Tests**: Test database operations in isolation
- **Integration Tests**: Test complete workflows
- **Performance Tests**: Validate query performance under load
- **Migration Tests**: Test schema changes and rollbacks

This schema provides a solid foundation for a high-performance, scalable chat application while maintaining data integrity and supporting all required features.