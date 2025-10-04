# Development Setup Guide

## Quick Start

### Frontend Only (UI Development)
If you're working on UI components and don't need backend functionality:

```bash
cd apps/web
pnpm install
pnpm dev
```

The frontend will run on `http://localhost:5173`. API calls will fail gracefully with timeout errors.

### Full Stack Development

#### 1. Start Required Services

The API requires PostgreSQL and Redis at minimum. Start them with Docker:

```bash
# Start all services (recommended)
docker-compose up -d

# Or start only essential services
docker-compose up -d postgres redis
```

**Service Ports:**
- PostgreSQL: `5432`
- Redis: `6379`
- MinIO (S3): `9000` (API), `9001` (Console)
- MeiliSearch: `7700`
- NATS: `4222` (Client), `8222` (Monitoring)
- ClamAV: `3310`

#### 2. Set Up Database

```bash
cd apps/api

# Install dependencies
pnpm install

# Run database migrations
pnpm prisma migrate dev

# (Optional) Seed development data
pnpm prisma db seed
```

#### 3. Start Backend API

```bash
cd apps/api
pnpm dev
```

The API will run on `http://localhost:3001`.

#### 4. Start Frontend

In a separate terminal:

```bash
cd apps/web
pnpm dev
```

The frontend will run on `http://localhost:5173`.

## Common Issues

### "Request timeout - API server may be unavailable"

This error means the API server is running but can't connect to required services.

**Solution:**
1. Check if Docker services are running: `docker-compose ps`
2. Start missing services: `docker-compose up -d postgres redis`
3. Check API logs for connection errors

### "ERR_CONNECTION_REFUSED"

The API server isn't running.

**Solution:**
```bash
cd apps/api
pnpm dev
```

### "CSRF token refresh failed"

The API server isn't accessible. This is normal in frontend-only mode and won't break the app.

### Database Connection Errors

**Solution:**
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check if it's healthy
docker-compose ps postgres

# View logs
docker-compose logs postgres
```

## Environment Variables

### Frontend (.env in apps/web)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Backend (.env in apps/api)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/telegram_chat"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"
```

## Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Run with coverage
pnpm test:coverage
```

## Useful Commands

```bash
# Check service health
docker-compose ps

# View service logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Restart a specific service
docker-compose restart [service-name]

# Open Prisma Studio (database GUI)
cd apps/api && pnpm prisma studio
```

## Development Workflow

1. **Start services**: `docker-compose up -d`
2. **Start API**: `cd apps/api && pnpm dev`
3. **Start frontend**: `cd apps/web && pnpm dev`
4. **Make changes** and see hot-reload in action
5. **Run tests** before committing
6. **Stop services** when done: `docker-compose down`

## Performance Tips

- Only start services you need (e.g., skip ClamAV for basic development)
- Use `docker-compose up -d postgres redis` for minimal setup
- Keep Docker Desktop running for better performance
- Use Prisma Studio for quick database inspection

## Next Steps

- Read [TESTING.md](./docs/TESTING.md) for testing guidelines
- Check [README.md](./README.md) for project overview
- Review [.kiro/specs/telegram-web-chat/](./kiro/specs/telegram-web-chat/) for feature specs
