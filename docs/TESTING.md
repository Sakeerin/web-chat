# Testing Guide

This document provides comprehensive information about the testing infrastructure and practices for the Telegram-like web chat application.

## Overview

Our testing strategy includes multiple layers of testing to ensure code quality, functionality, and performance:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between different parts of the system
- **End-to-End Tests**: Test complete user workflows in a browser environment
- **Load Tests**: Test system performance under high concurrent load

## Test Structure

```
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── **/*.spec.ts          # Unit tests
│   │   │   ├── **/*.integration.spec.ts # Integration tests
│   │   │   └── test/                 # Test utilities and setup
│   │   └── k6/                       # Load tests
│   └── web/
│       ├── src/
│       │   ├── **/*.test.{ts,tsx}    # Unit tests
│       │   └── test/                 # Test utilities and setup
│       └── e2e/                      # End-to-end tests
├── jest.config.js                    # Root Jest configuration
└── scripts/test-coverage.js          # Coverage analysis script
```

## Running Tests

### All Tests
```bash
# Run all tests across the monorepo
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run tests for CI
pnpm test:ci
```

### API Tests
```bash
# Unit tests only
pnpm --filter api test:unit

# Integration tests only
pnpm --filter api test:integration

# All API tests with coverage
pnpm --filter api test:cov

# Load tests
pnpm --filter api test:load
```

### Web Tests
```bash
# Unit tests only
pnpm --filter web test:unit

# Integration tests only
pnpm --filter web test:integration

# End-to-end tests
pnpm --filter web test:e2e

# E2E tests with UI
pnpm --filter web test:e2e:ui

# All web tests with coverage
pnpm --filter web test:cov
```

## Test Configuration

### Jest Configuration

The project uses Jest for unit and integration testing with the following key configurations:

- **API**: Node.js environment with ts-jest preset
- **Web**: jsdom environment with React Testing Library
- **Coverage thresholds**: 80% for API, 75% for Web
- **Separate configurations** for unit and integration tests

### Playwright Configuration

End-to-end tests use Playwright with:

- **Multiple browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Parallel execution**: Tests run in parallel for faster execution
- **Automatic retries**: Failed tests are retried on CI
- **Screenshots and videos**: Captured on test failures
- **Global setup/teardown**: Shared test data and cleanup

## Writing Tests

### Unit Tests (API)

```typescript
import { Test } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { PrismaService } from '../database/prisma.service'
import { JwtService } from '@nestjs/jwt'

describe('AuthService', () => {
  let service: AuthService
  let prisma: PrismaService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  it('should register a new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
      name: 'Test User'
    }

    prisma.user.create = jest.fn().mockResolvedValue({
      id: '1',
      ...userData
    })

    const result = await service.register(userData)
    
    expect(result).toBeDefined()
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: userData.email,
        username: userData.username,
        name: userData.name
      })
    })
  })
})
```

### Integration Tests (API)

```typescript
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { AppModule } from '../app.module'
import { PrismaService } from '../database/prisma.service'

describe('AuthController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = app.get<PrismaService>(PrismaService)
    await app.init()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await app.close()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany()
  })

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        username: 'testuser',
        name: 'Test User'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toBe('User registered successfully')
      })
  })
})
```

### Unit Tests (Web)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { LoginForm } from './LoginForm'
import { setupTestEnvironment } from '../test/test-utils'

// Setup test environment
setupTestEnvironment()

describe('LoginForm', () => {
  const mockOnLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    render(<LoginForm onLogin={mockOnLogin} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('should handle form submission', async () => {
    render(<LoginForm onLogin={mockOnLogin} />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })
})
```

### End-to-End Tests

```typescript
import { test, expect } from '@playwright/test'

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
  })

  test('should send a message', async ({ page }) => {
    // Select conversation
    await page.click('[data-testid="conversation-item"]')
    
    // Type and send message
    await page.fill('[data-testid="message-input"]', 'Hello, world!')
    await page.click('[data-testid="send-button"]')
    
    // Verify message appears
    await expect(page.locator('[data-testid="message-item"]').last())
      .toContainText('Hello, world!')
  })
})
```

## Test Data Management

### API Test Data

Use the `TestDataFactory` class for creating test data:

```typescript
import { TestDataFactory } from '../test/test-utils'

// In your test
const testDataFactory = new TestDataFactory(prisma, jwtService)

// Create test users
const user1 = await testDataFactory.createUser()
const user2 = await testDataFactory.createUser({ email: 'user2@example.com' })

// Create test conversation
const conversation = await testDataFactory.createConversation([user1.id, user2.id])

// Create test messages
const messages = await testDataFactory.createMessages(conversation.id, user1.id, 5)

// Generate auth token
const token = testDataFactory.generateAuthToken(user1.id)

// Cleanup
await testDataFactory.cleanup()
```

### Web Test Data

Use mock data and utilities:

```typescript
import { mockApiResponses, setupFetchMock } from '../test/test-utils'

// Setup fetch mocks
setupFetchMock()

// Use mock data
const mockUser = mockApiResponses.user
const mockConversation = mockApiResponses.conversation
```

## Coverage Requirements

### Coverage Thresholds

- **API**: 80% coverage for lines, functions, branches, and statements
- **Web**: 75% coverage for lines, functions, branches, and statements

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **LCOV**: For CI/CD integration
- **HTML**: Detailed interactive reports in `coverage/` directories
- **JSON**: Machine-readable format for tooling

### Viewing Coverage

```bash
# Generate and view HTML coverage report
pnpm test:cov

# Open coverage reports
open apps/api/coverage/index.html
open apps/web/coverage/index.html
```

## Continuous Integration

### GitHub Actions

The CI pipeline runs:

1. **Unit and Integration Tests**: On every push and PR
2. **End-to-End Tests**: On every push and PR
3. **Load Tests**: On pushes to main branch only

### Test Environment

CI tests run with:
- **PostgreSQL 15**: For database operations
- **Redis 7**: For caching and pub/sub
- **MeiliSearch**: For search functionality
- **Multiple Node.js versions**: Currently Node.js 20.x

### Artifacts

Test artifacts are uploaded to GitHub:
- **Coverage reports**: LCOV format for Codecov integration
- **E2E test results**: Screenshots, videos, and HTML reports
- **Load test results**: Performance metrics and charts

## Performance Testing

### Load Tests with k6

Load tests simulate real-world usage patterns:

```javascript
// Basic load test scenario
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% under 200ms
    ws_connection_success: ['rate>0.95'], // 95% WebSocket success
  },
}
```

### Performance Metrics

Key metrics tracked:
- **HTTP request duration**: API response times
- **WebSocket connection success**: Real-time connection reliability
- **Message latency**: End-to-end message delivery time
- **Concurrent users**: Maximum supported concurrent connections

## Best Practices

### Test Organization

1. **Group related tests**: Use `describe` blocks to organize tests
2. **Clear test names**: Use descriptive test names that explain what is being tested
3. **Setup and teardown**: Use `beforeEach`/`afterEach` for test isolation
4. **Mock external dependencies**: Mock APIs, databases, and external services

### Test Data

1. **Use factories**: Create reusable test data factories
2. **Clean up**: Always clean up test data after tests
3. **Isolation**: Each test should be independent
4. **Realistic data**: Use realistic test data that matches production

### Assertions

1. **Specific assertions**: Test specific behaviors, not implementation details
2. **Error cases**: Test both success and error scenarios
3. **Edge cases**: Test boundary conditions and edge cases
4. **User perspective**: Test from the user's perspective

### Performance

1. **Parallel execution**: Run tests in parallel when possible
2. **Selective testing**: Use test patterns to run specific tests
3. **Mock heavy operations**: Mock expensive operations like file I/O
4. **Optimize setup**: Minimize test setup time

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure test database is running
2. **Port conflicts**: Use different ports for test services
3. **Async timing issues**: Use proper async/await and waitFor utilities
4. **Mock cleanup**: Clear mocks between tests

### Debugging Tests

1. **Use debugger**: Add `debugger` statements in tests
2. **Console logging**: Add temporary console.log statements
3. **Test isolation**: Run single tests to isolate issues
4. **Check test output**: Review detailed test output and error messages

### CI/CD Issues

1. **Environment variables**: Ensure all required env vars are set
2. **Service dependencies**: Verify all required services are running
3. **Timing issues**: Add appropriate waits for async operations
4. **Resource limits**: Check for memory or CPU constraints

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [k6 Documentation](https://k6.io/docs/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)