# Users Module

This module implements user profile management and related functionality for the Telegram-like web chat application.

## Features Implemented

### ✅ User Profile CRUD Operations
- **Get Profile**: Retrieve user's own profile with full details including privacy settings
- **Get Public Profile**: Retrieve another user's profile with privacy settings applied
- **Update Profile**: Update name, bio, and avatar URL with validation
- **Profile Validation**: Input validation using class-validator decorators

### ✅ Username Management
- **Update Username**: Change username with uniqueness validation
- **Username Availability**: Check if a username is available
- **Username Suggestions**: Generate alternative usernames when requested username is taken
- **Username Validation**: Alphanumeric + underscore validation, 3-30 characters

### ✅ Privacy Settings Management
- **Last Seen Visibility**: Control who can see when user was last online (everyone/contacts/nobody)
- **Read Receipts Visibility**: Control who can see read receipts (everyone/contacts/nobody)
- **Contact Requests**: Allow/disallow contact requests from other users
- **Online Status**: Show/hide online status to other users
- **Privacy-Aware Public Profiles**: Respect privacy settings when showing user info to others

### ✅ User Search Functionality
- **Username Search**: Search users by username (exact match prioritized)
- **Name Search**: Search users by display name
- **Pagination**: Configurable limit and offset for search results
- **Privacy Respect**: Search results respect user privacy settings
- **Performance**: Optimized queries with proper indexing

### ✅ Activity Tracking
- **Last Seen Updates**: Track when user was last active
- **Online Status**: Track and update user's online/offline status
- **Automatic Updates**: Last seen updated when online status changes

## API Endpoints

### Profile Management
- `GET /users/me` - Get current user's profile
- `GET /users/:id` - Get public profile of another user
- `PUT /users/me` - Update current user's profile
- `PUT /users/me/username` - Update current user's username

### Privacy Settings
- `GET /users/me/privacy` - Get current privacy settings
- `PUT /users/me/privacy` - Update privacy settings

### Username Management
- `POST /users/check-username` - Check username availability

### Search
- `GET /users?query=...` - Search users with pagination

### Activity Tracking
- `POST /users/me/last-seen` - Update last seen timestamp
- `POST /users/me/online-status` - Update online status

## Data Transfer Objects (DTOs)

### UpdateProfileDto
```typescript
{
  name?: string;        // 2-50 characters, trimmed
  bio?: string;         // Max 500 characters, trimmed
  avatarUrl?: string;   // Valid URL format
}
```

### UpdateUsernameDto
```typescript
{
  username: string;     // 3-30 chars, alphanumeric + underscore, lowercase
}
```

### PrivacySettingsDto
```typescript
{
  lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody';
  readReceiptsVisibility?: 'everyone' | 'contacts' | 'nobody';
  allowContactRequests?: boolean;
  showOnlineStatus?: boolean;
}
```

### SearchUsersDto
```typescript
{
  query: string;        // Search term, min 2 characters
  limit?: number;       // 1-50, default 20
  offset?: number;      // Default 0
}
```

## Privacy Implementation

The module implements comprehensive privacy controls:

1. **Last Seen Visibility**:
   - `everyone`: All users can see last seen time
   - `contacts`: Only accepted contacts can see last seen time
   - `nobody`: No one can see last seen time

2. **Read Receipts Visibility**:
   - Controls who can see when user has read messages
   - Integrated with message receipt system

3. **Contact Relationship Checking**:
   - Checks if two users are contacts (accepted contact request)
   - Used to enforce privacy settings

4. **Public Profile Filtering**:
   - Automatically filters sensitive information based on privacy settings
   - Respects user preferences when showing profile to others

## Database Integration

- Uses Prisma ORM for type-safe database operations
- Proper error handling for database constraints
- Optimized queries with appropriate indexes
- Handles null/undefined conversion for optional fields

## Validation & Security

- Input validation using class-validator
- SQL injection prevention through Prisma
- Authentication required for all endpoints (JWT)
- Rate limiting ready (implemented at gateway level)
- Proper error messages without information leakage

## Testing

### Integration Tests (`users.service.integration.spec.ts`)
- Service initialization and method availability
- Basic functionality with mocked Prisma service
- Database interaction verification

### Controller Tests (`users.controller.spec.ts`)
- All endpoint functionality
- Request/response handling
- Authentication integration
- Error handling

## Performance Considerations

1. **Database Indexes**: Proper indexes on username, email, and search fields
2. **Query Optimization**: Selective field retrieval to minimize data transfer
3. **Pagination**: Configurable limits to prevent large result sets
4. **Caching Ready**: Service methods designed for easy caching integration

## Requirements Mapping

This implementation satisfies the following requirements from the specification:

- **Requirement 6.1**: Unique username handle requirement ✅
- **Requirement 6.2**: Avatar upload and image optimization (URL-based) ✅
- **Requirement 6.3**: Privacy settings for last seen and read receipts ✅
- **Requirement 6.4**: Profile updates synced across devices ✅
- **Requirement 5.5**: Server-side contact search functionality ✅

## Future Enhancements

- Avatar image processing and resizing
- Advanced search with filters
- User blocking integration
- Audit logging for profile changes
- Bulk operations for admin users
- Real-time profile update notifications