# Authentication Service

This module implements a comprehensive authentication system for the Telegram-like web chat application.

## Features

### Core Authentication
- **User Registration**: Email/password registration with Argon2id hashing
- **User Login**: Secure login with credential validation
- **JWT Tokens**: Access/refresh token pattern for stateless authentication
- **Session Management**: Multi-device session tracking and management
- **Password Reset**: Secure password reset flow (basic implementation)

### Security Features
- **Argon2id Hashing**: Industry-standard password hashing with unique salts
- **JWT Security**: Short-lived access tokens (10 minutes) with longer refresh tokens (7 days)
- **Session Tracking**: Device information tracking for security monitoring
- **Session Revocation**: Individual and bulk session termination

### API Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - Single session logout
- `POST /auth/logout-all` - All sessions logout

#### Session Management
- `GET /auth/sessions` - List active sessions
- `DELETE /auth/sessions/:id` - Revoke specific session

#### Password Reset
- `POST /auth/password-reset/request` - Request password reset
- `POST /auth/password-reset/confirm` - Confirm password reset

#### Profile
- `GET /auth/me` - Get current user profile

## Architecture

### Components
- **AuthService**: Core business logic for authentication operations
- **AuthController**: HTTP endpoints and request handling
- **JwtStrategy**: JWT token validation strategy
- **LocalStrategy**: Username/password validation strategy
- **Guards**: Authentication and authorization guards

### Database Integration
- Uses Prisma ORM for database operations
- Supports PostgreSQL with proper indexing
- Handles user and session data with relationships

### Security Considerations
- Passwords are hashed with Argon2id and unique salts
- JWT tokens have appropriate expiration times
- Session validation includes user status checks
- Device tracking for security monitoring

## Usage

### Registration
```typescript
const result = await authService.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  username: 'username',
  name: 'User Name'
})
```

### Login
```typescript
const result = await authService.login({
  email: 'user@example.com',
  password: 'SecurePassword123!'
})
```

### Protected Routes
```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
async getProtectedResource(@Request() req) {
  // req.user contains authenticated user info
  return { userId: req.user.userId }
}
```

## Testing

The module includes comprehensive unit tests covering:
- Authentication service methods
- Controller endpoints
- JWT and Local strategies
- Error handling scenarios

Run tests with:
```bash
npm run test -- --testPathPattern="auth"
```

## Configuration

Required environment variables:
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_ACCESS_EXPIRES_IN`: Access token expiration (default: 10m)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (default: 7d)
- `DATABASE_URL`: PostgreSQL connection string

## Requirements Fulfilled

This implementation satisfies the following requirements from the specification:

- **1.1**: Email/password authentication with OTP verification (basic structure)
- **1.2**: Secure session creation with JWT tokens
- **1.3**: Multi-device concurrent session support
- **1.4**: Session management with device information display
- **1.5**: Session revocation capabilities
- **8.1**: Argon2id password hashing with unique salts
- **8.5**: Progressive login delays (basic structure for rate limiting)

## Future Enhancements

- 2FA/TOTP implementation
- Email verification system
- Advanced rate limiting
- Password reset email integration
- Audit logging for security events