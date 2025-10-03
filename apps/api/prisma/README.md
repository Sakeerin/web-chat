# Database Schema Documentation

## Overview

This directory contains the Prisma schema and related database files for the Telegram-like web chat application. The schema is designed to support real-time messaging, user management, file attachments, and all the core features required for a modern chat application.

## Schema Structure

### Core Entities

#### Users (`users`)
- **Primary Key**: `id` (CUID)
- **Unique Fields**: `username`, `email`, `phone`
- **Features**: 
  - Argon2id password hashing with unique salts
  - Privacy settings (JSON)
  - Online status and last seen tracking
  - Account status management (active, verified, suspended)

#### Conversations (`conversations`)
- **Primary Key**: `id` (CUID)
- **Types**: DM, GROUP, CHANNEL
- **Features**:
  - Support for both direct messages and group chats
  - Owner-based permissions for groups
  - Archiving and custom settings

#### Messages (`messages`)
- **Primary Key**: `id` (CUID - time-ordered)
- **Types**: TEXT, IMAGE, VIDEO, AUDIO, FILE, SYSTEM
- **Features**:
  - Reply functionality with message threading
  - Edit history tracking
  - Soft deletion with tombstone records
  - Rich metadata support

#### Attachments (`attachments`)
- **Primary Key**: `id` (CUID)
- **Features**:
  - S3-compatible object storage integration
  - Automatic thumbnail generation
  - Virus scanning integration
  - Media metadata (dimensions, duration)

### Supporting Entities

#### User Sessions (`user_sessions`)
- Multi-device session management
- Device fingerprinting and tracking
- Refresh token rotation
- Session expiration and cleanup

#### Conversation Members (`conversation_members`)
- Role-based permissions (OWNER, ADMIN, MODERATOR, MEMBER)
- Join/leave tracking
- Muting and notification preferences
- Last read message tracking

#### Message Receipts (`message_receipts`)
- Delivery confirmation (DELIVERED, READ)
- Privacy-aware read receipts
- Per-user receipt tracking

#### Contact Management
- **Contact Requests** (`contact_requests`): Friend request system
- **Blocked Users** (`blocked_users`): User blocking functionality
- **User Reports** (`user_reports`): Abuse reporting system

#### Administrative
- **Audit Logs** (`audit_logs`): Admin action tracking
- **Message Edits** (`message_edits`): Message edit history

## Performance Optimizations

### Indexes

The schema includes strategic indexes for optimal query performance:

```sql
-- Message retrieval (most common query pattern)
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- User lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Conversation member queries
CREATE INDEX idx_conversation_members_user_active ON conversation_members(user_id, is_active);
CREATE INDEX idx_conversation_members_conversation_active ON conversation_members(conversation_id, is_active);

-- Message receipts
CREATE INDEX idx_message_receipts_message_type ON message_receipts(message_id, type);

-- Session management
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
```

### Partitioning Strategy

For high-scale deployments, consider:
- **Messages table**: Partition by `conversation_id` hash for horizontal scaling
- **Attachments table**: Partition by creation date for archival
- **Audit logs**: Partition by date for efficient cleanup

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `apps/api` directory:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/telegram_chat?schema=public"
```

### 2. Start Database Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
docker-compose ps
```

### 3. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Create and apply initial migration
npx prisma migrate dev --name init

# Seed development data
npx prisma db seed
```

### 4. Database Management

```bash
# Open Prisma Studio for data browsing
npx prisma studio

# Reset database (development only)
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy
```

## Development Workflow

### Adding New Fields

1. Update the `schema.prisma` file
2. Generate a new migration: `npx prisma migrate dev --name add_new_field`
3. Update the seed script if needed
4. Test the changes locally

### Performance Monitoring

Monitor these key metrics:
- Query execution time for message retrieval
- Index usage and effectiveness
- Connection pool utilization
- Database size and growth patterns

### Backup Strategy

- **Development**: Automated daily backups
- **Production**: 
  - Continuous WAL archiving
  - Daily full backups with 30-day retention
  - Point-in-time recovery capability

## Security Considerations

### Data Protection
- All passwords use Argon2id hashing with unique salts
- Sensitive data is encrypted at rest
- Database connections use TLS encryption

### Access Control
- Database users have minimal required permissions
- Connection pooling with pgbouncer for security and performance
- Regular security updates and vulnerability scanning

### Privacy Compliance
- User data export capabilities (GDPR compliance)
- Right to deletion with proper data cleanup
- Audit trails for all data access and modifications

## Troubleshooting

### Common Issues

1. **Migration Failures**
   - Check database connectivity
   - Verify schema syntax
   - Review migration logs

2. **Performance Issues**
   - Analyze query execution plans
   - Check index usage
   - Monitor connection pool metrics

3. **Data Integrity**
   - Validate foreign key constraints
   - Check for orphaned records
   - Verify backup integrity

### Useful Commands

```bash
# Check database status
npx prisma db pull

# Validate schema
npx prisma validate

# Format schema file
npx prisma format

# Generate ERD (requires external tool)
npx prisma-erd-generator
```