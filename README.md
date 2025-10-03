# Telegram Web Chat

A fast, secure, and scalable web chat application that provides a Telegram-like experience in the browser. Built with React PWA frontend and NestJS backend services.

## Features

- 🚀 **Real-time messaging** with sub-second delivery
- 👥 **Group chats** supporting up to 500 members
- 📁 **Rich media sharing** (images, videos, files up to 50MB)
- 🔍 **Advanced search** through messages and contacts
- 📱 **Progressive Web App** with offline support
- 🔒 **Security-first** with encryption and privacy controls
- 🌐 **Cross-platform** compatibility

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- React Query for server state
- Zustand for client state
- Tailwind CSS + Radix UI
- Socket.IO for real-time communication

### Backend
- Node.js 20 LTS with TypeScript
- NestJS framework
- Socket.IO for WebSocket handling
- Prisma ORM
- PostgreSQL database
- Redis for caching and pub/sub
- NATS for message streaming

### Infrastructure
- Docker containers
- MinIO for object storage
- MeiliSearch for full-text search
- ClamAV for antivirus scanning

## Quick Start

### Prerequisites

- Node.js 20 LTS or higher
- pnpm 8.0 or higher
- Docker and Docker Compose

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd telegram-web-chat
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development environment:
```bash
# Start all services (databases, Redis, etc.)
docker-compose up -d

# Start the development servers
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MinIO Console: http://localhost:9001
- MeiliSearch: http://localhost:7700

### Development Commands

```bash
# Development
pnpm dev              # Start both frontend and backend
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all code
pnpm format           # Format all code

# Database
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed development data
pnpm db:studio        # Open Prisma Studio

# Testing
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests
pnpm test:e2e         # End-to-end tests
pnpm test:load        # Load testing with k6
```

## Project Structure

```
telegram-web-chat/
├── apps/
│   ├── web/          # React PWA frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── ui/           # Reusable UI components
│   └── config/       # Shared configuration
├── docker/           # Docker configurations
└── docs/             # Documentation
```

## Performance Targets

- **Message latency**: P50 < 150ms same-region
- **API response time**: P95 < 200ms
- **Initial load time**: P95 < 1.2s on 4G
- **Search response**: P95 < 300ms
- **Concurrent users**: ≥10,000 WebSocket connections
- **Message throughput**: ≥500 messages/second

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.