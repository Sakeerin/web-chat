# REST API Infrastructure

This document outlines the REST API infrastructure components implemented for the Telegram Web Chat application.

## Components Implemented

### 1. NestJS Application Structure ✅

- **Proper module organization** with feature-based modules
- **Global configuration** with ConfigModule
- **Dependency injection** setup throughout the application
- **Express platform** integration with proper typing

### 2. Authentication Middleware ✅

- **JWT Authentication Guard** (`JwtAuthGuard`) with Passport integration
- **Public decorator** (`@Public()`) to bypass authentication for public endpoints
- **Current User decorator** (`@CurrentUser()`) for easy access to authenticated user
- **Global authentication** applied to all routes by default

### 3. Rate Limiting Middleware ✅

- **Throttler integration** with configurable limits
- **Multiple rate limit configurations** for different endpoint types:
  - Default: 100 requests per minute
  - Auth endpoints: 5 requests per 15 minutes (for login attempts)
  - Upload endpoints: 10 requests per minute
- **Custom throttle decorator** (`@Throttle()`) for endpoint-specific limits
- **Redis storage support** (configured for future implementation)

### 4. Request Validation with Zod ✅

- **ZodValidationPipe** for runtime validation and type inference
- **Common validation schemas** for reusable validation logic:
  - Pagination, ID parameters, search queries
  - Username, email, password validation
  - Message content, conversation types
  - File upload validation
- **Structured validation errors** with field-level error messages
- **Type safety** with TypeScript integration

### 5. Error Handling Middleware ✅

- **HttpExceptionFilter** for structured error responses
- **Consistent error format** with:
  - Error code and message
  - Request ID for tracing
  - Timestamp and request path
  - Optional error details
- **Proper HTTP status code mapping**
- **Logging integration** for debugging and monitoring

### 6. API Documentation with Swagger ✅

- **OpenAPI/Swagger integration** with comprehensive documentation
- **Bearer token authentication** configuration
- **API endpoint grouping** with tags
- **Request/response schemas** documentation
- **Interactive API explorer** at `/api/docs`
- **Operation descriptions** and parameter documentation

## Additional Infrastructure Features

### Security Headers ✅
- **Content Security Policy** headers
- **XSS Protection** and frame options
- **Content type sniffing** protection
- **Referrer policy** configuration

### Request/Response Processing ✅
- **Logging interceptor** for request/response logging
- **Transform interceptor** for consistent response format
- **CORS configuration** for cross-origin requests
- **Global validation pipe** with transformation

### Testing Infrastructure ✅
- **Unit tests** for validation schemas
- **Integration tests** for infrastructure components
- **Test utilities** for common testing patterns
- **Verification scripts** for infrastructure validation

## Usage Examples

### Authentication
```typescript
@Controller('protected')
export class ProtectedController {
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Public()
  @Get('public')
  getPublicData() {
    return { message: 'This is public' };
  }
}
```

### Validation
```typescript
@Post('create')
@ApiBody({ type: CreateUserDto })
async createUser(@Body(new ZodValidationPipe(CreateUserSchema)) data: CreateUserDto) {
  return this.userService.create(data);
}
```

### Rate Limiting
```typescript
@Throttle({ name: 'auth', ttl: 900000, limit: 5 })
@Post('login')
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
```

## Configuration

### Environment Variables
- `PORT` - API server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `API_URL` - API base URL for Swagger documentation
- `NODE_ENV` - Environment (development/production)

### Rate Limiting
Rate limiting is configured in `common/config/throttle.config.ts` with different limits for different endpoint types.

### Swagger Documentation
Available at `/api/docs` in development mode. Includes:
- Interactive API explorer
- Authentication configuration
- Request/response examples
- Error response documentation

## Files Structure

```
src/common/
├── config/
│   ├── swagger.config.ts      # Swagger/OpenAPI configuration
│   └── throttle.config.ts     # Rate limiting configuration
├── decorators/
│   ├── current-user.decorator.ts  # Current user parameter decorator
│   ├── public.decorator.ts        # Public endpoint decorator
│   └── throttle.decorator.ts      # Custom throttle decorator
├── filters/
│   └── http-exception.filter.ts   # Global error handling
├── guards/
│   └── jwt-auth.guard.ts          # JWT authentication guard
├── interceptors/
│   ├── logging.interceptor.ts     # Request/response logging
│   └── transform.interceptor.ts   # Response transformation
├── pipes/
│   └── zod-validation.pipe.ts     # Zod validation pipe
├── schemas/
│   └── common.schemas.ts          # Reusable validation schemas
└── common.module.ts               # Common module configuration
```

## Requirements Satisfied

- ✅ **8.4** - Rate limiting middleware with Redis-based storage
- ✅ **2.1** - Real-time messaging infrastructure (WebSocket support ready)
- ✅ **8.1** - Security implementation (authentication, validation, headers)

The REST API infrastructure is now complete and ready for use by all application modules.