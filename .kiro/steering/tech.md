# Technology Stack & Build System

## Architecture

**Microservices architecture** with React PWA frontend and Node.js/TypeScript backend services communicating via REST APIs and WebSocket connections.

## Frontend Stack

- **React 18** with TypeScript for type safety
- **Vite** for fast build tooling and development
- **React Router** for client-side navigation
- **React Query** for server state management and caching
- **Zustand** for lightweight client state management
- **Tailwind CSS + Radix UI** for styling and accessible components
- **Socket.IO client** for real-time WebSocket communication

## Backend Stack

- **Node.js 20 LTS** with TypeScript
- **NestJS** framework for structure, dependency injection, and scalability
- **Socket.IO** for WebSocket handling and real-time features
- **Prisma ORM** for type-safe database operations
- **Zod** for runtime validation and type inference
- **JWT** for stateless authentication

## Infrastructure & Data

- **PostgreSQL** for primary data storage with read replicas
- **Redis** for caching, pub/sub, and session storage
- **NATS** for message streaming and event distribution
- **S3-compatible storage** (MinIO for dev) for file uploads
- **MeiliSearch** for full-text search capabilities
- **Docker + Kubernetes** for containerization and orchestration

## Development Tools

- **pnpm workspaces** for monorepo management
- **ESLint + Prettier** for code quality and formatting
- **Jest** for unit and integration testing
- **Playwright** for end-to-end testing
- **k6** for performance and load testing

## Common Commands

### Development Setup
```bash
# Install dependencies
pnpm install

# Start development environment
docker-compose up -d  # Start databases and services
pnpm dev             # Start both frontend and backend in dev mode

# Database operations
pnpm db:migrate      # Run database migrations
pnpm db:seed         # Seed development data
pnpm db:studio       # Open Prisma Studio
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit       # Unit tests only
pnpm test:integration # Integration tests
pnpm test:e2e        # End-to-end tests

# Performance testing
pnpm test:load       # Load testing with k6
```

### Build & Deploy
```bash
# Build for production
pnpm build

# Build Docker images
docker build -t chat-api ./apps/api
docker build -t chat-web ./apps/web

# Deploy to staging/production
pnpm deploy:staging
pnpm deploy:prod
```

## Performance Requirements

- **Message latency**: P50 < 150ms same-region
- **API response time**: P95 < 200ms
- **Initial load time**: P95 < 1.2s on 4G
- **Search response**: P95 < 300ms
- **Concurrent users**: ≥10,000 WebSocket connections
- **Message throughput**: ≥500 messages/second

## Security Standards

- **TLS 1.3** for all communications
- **Argon2id** for password hashing
- **JWT** with short-lived access tokens (5-10 min)
- **Rate limiting** on all endpoints
- **Input validation** with Zod schemas
- **OWASP** security guidelines compliance