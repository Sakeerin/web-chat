# Telegram Web Chat - Frontend

A modern React PWA frontend for the Telegram-like web chat application.

## Tech Stack

- **React 18** with TypeScript for type safety
- **Vite** for fast build tooling and development
- **React Router** for client-side navigation with protected routes
- **React Query** for server state management and caching
- **Zustand** for lightweight client state management
- **Tailwind CSS + Radix UI** for styling and accessible components
- **Socket.IO client** for real-time WebSocket communication

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── chat/           # Chat-specific components
│   └── common/         # Common app components
├── pages/              # Route-level page components
├── hooks/              # Custom React hooks
├── stores/             # Zustand state stores
├── services/           # API client and WebSocket services
├── lib/                # Utility libraries and configurations
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## Key Features Implemented

### 1. Routing with Protected Routes
- React Router setup with protected route wrapper
- Automatic redirect to login for unauthenticated users
- Return URL preservation for seamless login flow

### 2. State Management
- **Auth Store**: User authentication, session management
- **Chat Store**: Conversations, messages, real-time state
- Persistent storage for auth state using Zustand persist middleware

### 3. Real-time Communication
- Socket.IO client with automatic reconnection logic
- Connection state management and presence tracking
- Typing indicators and message delivery states
- Room-based message broadcasting

### 4. API Integration
- Centralized API service with automatic token management
- React Query integration for server state caching
- Error handling and automatic token refresh
- File upload support with FormData

### 5. Development Setup
- TypeScript path mapping for clean imports
- Vitest testing setup with jsdom environment
- ESLint and Prettier for code quality
- Hot module replacement for fast development

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001

# WebSocket Configuration  
VITE_WS_URL=http://localhost:3001

# Environment
VITE_NODE_ENV=development

# Feature Flags
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_MOCK_DATA=false
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm test                # Run unit tests
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run end-to-end tests

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier
```

## Socket.IO Integration

The frontend automatically connects to the WebSocket server when a user is authenticated:

- **Connection Management**: Automatic connection/disconnection based on auth state
- **Reconnection Logic**: Exponential backoff with jitter to prevent thundering herd
- **Presence Tracking**: Online/offline status updates
- **Message Delivery**: Real-time message broadcasting with acknowledgments
- **Typing Indicators**: Live typing status for active conversations

## State Management Architecture

### Auth Store
- User profile and session data
- JWT token management with automatic refresh
- Authentication state persistence

### Chat Store  
- Active conversations and message history
- Real-time state (typing users, online presence)
- Connection status and loading states
- Optimistic UI updates for instant feedback

## Testing Strategy

- **Unit Tests**: Component logic and utility functions
- **Integration Tests**: API integration and WebSocket communication  
- **E2E Tests**: Complete user workflows (planned for task 27)

## Next Steps

This frontend infrastructure is ready for implementing the remaining UI components:

- Task 14: Authentication UI and session management
- Task 15: User profile and settings interface
- Task 16: Contact management UI
- Task 17: Chat list and conversation interface
- Task 18: Message interface and real-time communication

The foundation provides:
- ✅ React 18 with TypeScript and Vite
- ✅ React Router with protected routes
- ✅ Tailwind CSS and Radix UI setup
- ✅ React Query for server state management
- ✅ Zustand for client state management
- ✅ Socket.IO client with reconnection logic
- ✅ API service with error handling
- ✅ Testing infrastructure with Vitest