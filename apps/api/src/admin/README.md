# Admin Module

This module provides comprehensive administrative and moderation tools for the chat application, implementing the requirements from Requirement 11: Administrative Features.

## Features

### User Management
- View and search users with pagination
- Suspend users with optional duration
- Ban users (temporary or permanent)
- Update user roles (USER, MODERATOR, ADMIN)
- Unsuspend users
- View detailed user information and activity

### Content Moderation
- Review and manage user reports
- View reported content and user activity
- Delete inappropriate messages
- Archive/delete conversations
- Track moderation actions

### Audit Logging
- Immutable audit logs for all admin actions
- Detailed action tracking with context
- Admin activity summaries
- System-wide audit summaries
- Searchable and filterable logs

### Analytics and Monitoring
- System overview statistics
- User growth analytics
- Message volume analytics
- Report analytics with resolution times
- System health monitoring

## API Endpoints

### User Management
- `GET /admin/users` - List users with filtering and pagination
- `GET /admin/users/:userId` - Get detailed user information
- `POST /admin/users/:userId/suspend` - Suspend a user
- `POST /admin/users/:userId/unsuspend` - Unsuspend a user
- `POST /admin/users/:userId/ban` - Ban a user
- `PUT /admin/users/:userId/role` - Update user role

### Report Management
- `GET /admin/reports` - List reports with filtering
- `GET /admin/reports/:reportId` - Get detailed report information
- `GET /admin/reports/:reportId/content` - Get reported user's content
- `PUT /admin/reports/:reportId/review` - Review and update report status

### Content Moderation
- `DELETE /admin/messages/:messageId` - Delete a message
- `DELETE /admin/conversations/:conversationId` - Delete a conversation

### Analytics
- `GET /admin/analytics` - Get system analytics overview
- `GET /admin/analytics/users` - Get user growth analytics
- `GET /admin/analytics/messages` - Get message analytics
- `GET /admin/analytics/reports` - Get report analytics

### Audit Logs
- `GET /admin/audit-logs` - List audit logs with filtering
- `GET /admin/audit-logs/:logId` - Get specific audit log
- `GET /admin/audit-logs/admin/:adminId/activity` - Get admin activity
- `GET /admin/audit-logs/system/summary` - Get system audit summary

## Security

### Access Control
- Only users with ADMIN or MODERATOR roles can access admin endpoints
- AdminGuard validates user permissions on each request
- Role-based restrictions (e.g., admins cannot be suspended by other admins)

### Audit Trail
- All admin actions are logged with:
  - Admin ID who performed the action
  - Action type and timestamp
  - Resource affected and resource ID
  - Detailed context and reasoning
  - Immutable audit records

### Input Validation
- All inputs validated using Zod schemas
- Sanitization of user inputs
- Rate limiting on admin endpoints
- CSRF protection

## Database Schema

### User Roles
```sql
enum UserRole {
  USER
  MODERATOR  
  ADMIN
}
```

### Audit Logs
```sql
model AuditLog {
  id         String @id @default(cuid())
  adminId    String
  action     String
  resource   String
  resourceId String?
  details    Json   @default("{}")
  createdAt  DateTime @default(now())
}
```

### User Reports
```sql
model UserReport {
  id             String @id @default(cuid())
  reporterId     String
  reportedUserId String
  reason         String
  description    String?
  status         ReportStatus @default(PENDING)
  reviewedBy     String?
  reviewedAt     DateTime?
  resolution     String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

## Usage Examples

### Suspend a User
```typescript
const result = await adminService.suspendUser(
  {
    userId: 'user123',
    reason: 'Violation of community guidelines',
    duration: 24 // hours
  },
  'admin456'
)
```

### Review a Report
```typescript
const result = await moderationService.reviewReport(
  {
    reportId: 'report123',
    status: 'RESOLVED',
    resolution: 'User has been warned and content removed'
  },
  'admin456'
)
```

### Get System Analytics
```typescript
const analytics = await analyticsService.getSystemAnalytics()
// Returns: totalUsers, activeUsers, totalMessages, etc.
```

## Testing

The module includes comprehensive tests:
- Unit tests for all services
- Integration tests for API endpoints
- Mock data and test utilities
- Security and permission testing

Run tests:
```bash
npm test admin
```

## Frontend Integration

The admin interface is accessible at `/admin` and includes:
- Dashboard with system overview
- User management interface
- Report review interface
- Audit log viewer
- Analytics dashboard

Only users with ADMIN or MODERATOR roles can access the admin interface.

## Performance Considerations

- Pagination for all list endpoints
- Database indexes on frequently queried fields
- Caching for analytics data
- Efficient queries with proper joins
- Rate limiting to prevent abuse

## Monitoring and Alerts

- System health indicators
- Performance metrics tracking
- Alert thresholds for critical metrics
- Real-time monitoring dashboard
- Automated report escalation

## Compliance

- GDPR compliance for user data handling
- Audit trail for regulatory requirements
- Data retention policies
- Privacy controls and user rights
- Secure data deletion procedures