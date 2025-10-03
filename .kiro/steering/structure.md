# Project Structure & Organization

## Monorepo Layout

```
telegram-web-chat/
├── apps/
│   ├── web/                 # React PWA frontend
│   └── api/                 # NestJS backend services
├── packages/
│   ├── shared/              # Shared types and utilities
│   ├── ui/                  # Reusable UI components
│   └── config/              # Shared configuration
├── docker/                  # Docker configurations
├── k8s/                     # Kubernetes manifests
├── docs/                    # Documentation
└── tools/                   # Build and deployment scripts
```

## Frontend Structure (apps/web)

```
apps/web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (buttons, inputs)
│   │   ├── chat/           # Chat-specific components
│   │   ├── auth/           # Authentication components
│   │   └── common/         # Common app components
│   ├── pages/              # Route-level page components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state stores
│   ├── services/           # API client and WebSocket services
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── assets/             # Static assets
├── public/                 # Public static files
└── tests/                  # Component and integration tests
```

## Backend Structure (apps/api)

```
apps/api/
├── src/
│   ├── modules/            # Feature modules
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management module
│   │   ├── chat/          # Chat and messaging module
│   │   ├── upload/        # File upload module
│   │   └── search/        # Search functionality module
│   ├── common/            # Shared utilities and decorators
│   │   ├── guards/        # Authentication and authorization guards
│   │   ├── interceptors/  # Request/response interceptors
│   │   ├── pipes/         # Validation pipes
│   │   └── filters/       # Exception filters
│   ├── database/          # Database configuration and migrations
│   └── config/            # Application configuration
├── prisma/                # Prisma schema and migrations
└── tests/                 # Unit and integration tests
```

## Shared Packages

### packages/shared
- **types/**: Common TypeScript interfaces and types
- **constants/**: Application constants and enums
- **utils/**: Utility functions used across frontend and backend
- **validation/**: Zod schemas for data validation

### packages/ui
- **components/**: Reusable UI components built with Radix UI
- **styles/**: Tailwind CSS configurations and custom styles
- **icons/**: SVG icon components
- **themes/**: Theme definitions and color schemes

## File Naming Conventions

### Frontend
- **Components**: PascalCase (`MessageList.tsx`, `ChatInput.tsx`)
- **Hooks**: camelCase with "use" prefix (`useAuth.ts`, `useWebSocket.ts`)
- **Stores**: camelCase with "Store" suffix (`authStore.ts`, `chatStore.ts`)
- **Pages**: PascalCase (`LoginPage.tsx`, `ChatPage.tsx`)
- **Utils**: camelCase (`formatDate.ts`, `validateInput.ts`)

### Backend
- **Modules**: kebab-case directories (`auth/`, `chat/`, `user-profile/`)
- **Services**: PascalCase with "Service" suffix (`AuthService.ts`, `ChatService.ts`)
- **Controllers**: PascalCase with "Controller" suffix (`AuthController.ts`)
- **DTOs**: PascalCase with "Dto" suffix (`CreateUserDto.ts`, `LoginDto.ts`)
- **Entities**: PascalCase (`User.ts`, `Message.ts`, `Conversation.ts`)

## Import Organization

### Import Order (enforced by ESLint)
1. Node modules (React, NestJS, etc.)
2. Internal packages (`@shared/types`, `@ui/components`)
3. Relative imports (same module)
4. Type-only imports (grouped separately)

```typescript
// Example import structure
import React from 'react'
import { Socket } from 'socket.io-client'

import { Button } from '@ui/components'
import { UserDto } from '@shared/types'

import { useAuth } from '../hooks/useAuth'
import { formatDate } from './utils'

import type { Message } from '@shared/types'
import type { ComponentProps } from 'react'
```

## Database Organization

### Schema Structure
- **Core entities**: Users, Conversations, Messages, Attachments
- **Relationship tables**: ConversationMembers, ContactRequests, UserSessions
- **Audit tables**: MessageEdits, UserActions, AdminLogs
- **Indexes**: Optimized for query patterns (conversation + timestamp, user lookups)

### Migration Strategy
- **Incremental migrations** with rollback capabilities
- **Data seeding** for development and testing environments
- **Performance indexes** added with separate migrations
- **Partitioning strategy** for large tables (messages by conversation_id hash)

## Testing Organization

### Frontend Tests
- **Unit tests**: Component logic and utility functions
- **Integration tests**: API integration and WebSocket communication
- **E2E tests**: Complete user workflows and critical paths

### Backend Tests
- **Unit tests**: Service logic and utility functions
- **Integration tests**: Database operations and API endpoints
- **Load tests**: Performance and concurrency testing

## Configuration Management

### Environment-specific configs
- **development**: Local development with Docker services
- **staging**: Production-like environment for testing
- **production**: Optimized for performance and security

### Feature flags
- **Experimental features**: Gradual rollout capabilities
- **A/B testing**: User experience optimization
- **Emergency toggles**: Quick feature disabling in production