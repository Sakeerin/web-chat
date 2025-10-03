# WebSocket Infrastructure and Real-time Engine

This module implements the real-time messaging infrastructure for the Telegram-like web chat application using Socket.IO and Redis for horizontal scaling.

## Architecture Overview

The WebSocket infrastructure consists of several key components:

- **WebSocketGateway**: Main Socket.IO gateway handling client connections and events
- **WebSocketService**: Core service for room management and message broadcasting
- **PresenceService**: Manages user online/offline status and presence tracking
- **TypingService**: Handles typing indicators with automatic timeout
- **RedisPubSubService**: Enables horizontal scaling through Redis pub/sub

## Features Implemented

### ✅ Authentication Middleware
- JWT token-based authentication for WebSocket connections
- 10-second authentication timeout for security
- Automatic disconnection of unauthenticated clients

### ✅ Room-based Message Broadcasting
- Conversation-based rooms using Socket.IO rooms
- Redis-backed room membership tracking
- Horizontal scaling support through Redis pub/sub

### ✅ Connection Management with Reconnection Handling
- Graceful connection/disconnection handling
- Automatic cleanup of user state on disconnect
- Socket tracking per user for multi-device support

### ✅ Presence Tracking System
- Redis-based presence state storage
- Online/offline/away status tracking
- Multi-socket support for same user across devices
- Automatic offline detection when all sockets disconnect

### ✅ Typing Indicator Functionality
- Debounced typing indicators (5-second auto-stop)
- Per-conversation typing state
- Automatic cleanup on disconnect
- Redis-based storage for horizontal scaling

### ✅ Message Acknowledgment System
- Delivery confirmation for sent messages
- Temporary ID to server ID mapping
- Real-time acknowledgment to sender

## API Events

### Client to Server Events

```typescript
// Authentication (required first)
socket.emit('auth', token: string)

// Room management
socket.emit('join-room', conversationId: string)
socket.emit('leave-room', conversationId: string)

// Typing indicators
socket.emit('typing-start', conversationId: string)
socket.emit('typing-stop', conversationId: string)

// Presence updates
socket.emit('presence-update', status: 'online' | 'away' | 'offline')

// Heartbeat for connection health
socket.emit('heartbeat')

// Get online users in conversation
socket.emit('get-online-users', conversationId: string)
```

### Server to Client Events

```typescript
// Authentication responses
socket.on('auth-success', (data: { userId: string }) => {})
socket.on('error', (error: { code: string, message: string }) => {})

// Room management responses
socket.on('room-joined', (data: { conversationId: string }) => {})
socket.on('room-left', (data: { conversationId: string }) => {})

// Real-time message events
socket.on('message-new', (message: Message) => {})
socket.on('message-ack', (tempId: string, messageId: string) => {})
socket.on('message-edited', (message: Message) => {})
socket.on('message-deleted', (messageId: string) => {})

// Typing indicators
socket.on('typing', (userId: string, conversationId: string) => {})
socket.on('typing-stop', (userId: string, conversationId: string) => {})

// Presence updates
socket.on('presence', (userId: string, status: PresenceStatus) => {})

// Message receipts
socket.on('receipt', (messageId: string, userId: string, type: 'delivered' | 'seen') => {})

// Heartbeat response
socket.on('heartbeat-ack', () => {})

// Online users response
socket.on('online-users', (data: { conversationId: string, users: string[] }) => {})
```

## Redis Data Structures

### User Socket Tracking
```
user:{userId}:sockets -> Set of socket IDs
TTL: 1 hour
```

### Room Membership
```
user:{userId}:rooms -> Set of conversation IDs
room:{conversationId}:users -> Set of user IDs
```

### Presence Data
```
presence:{userId} -> JSON {
  userId: string,
  status: 'online' | 'away' | 'offline',
  lastSeenAt: Date,
  socketIds: string[]
}
TTL: 1 hour (online), 5 minutes (offline)
```

### Typing Indicators
```
typing:{conversationId}:{userId} -> JSON {
  userId: string,
  conversationId: string,
  isTyping: boolean,
  lastTypingAt: Date
}
TTL: 10 seconds
```

## Pub/Sub Channels

### Message Events
- `message:new` - New message created
- `message:edited` - Message edited
- `message:deleted` - Message deleted
- `message:receipt` - Message delivery/read receipt

### Presence Events
- `presence:update` - User presence status changed

### Typing Events
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

## Performance Characteristics

### Latency Targets
- **Message delivery**: P50 < 150ms same-region
- **Typing indicators**: < 100ms
- **Presence updates**: < 200ms

### Scalability
- **Concurrent connections**: Designed for 10,000+ per instance
- **Horizontal scaling**: Redis pub/sub enables multi-instance deployment
- **Memory usage**: Efficient Redis data structures with appropriate TTLs

## Error Handling

### Connection Errors
- `AUTH_TIMEOUT` - Client failed to authenticate within 10 seconds
- `AUTH_FAILED` - Invalid JWT token provided
- `NOT_AUTHENTICATED` - Attempting to use features without authentication

### Room Errors
- `JOIN_ROOM_FAILED` - Failed to join conversation room

### General Errors
- Graceful degradation on Redis connection issues
- Automatic reconnection for Redis clients
- Comprehensive error logging

## Testing

### Unit Tests
- WebSocketService: Room management, broadcasting, user tracking
- PresenceService: Status tracking, multi-socket handling
- TypingService: Typing indicators, timeout management

### Integration Tests
- Full WebSocket connection flow
- Authentication and authorization
- Real-time event broadcasting
- Multi-client scenarios

## Usage Examples

### Basic Connection and Authentication
```typescript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

socket.on('connect', () => {
  socket.emit('auth', jwtToken)
})

socket.on('auth-success', ({ userId }) => {
  console.log('Authenticated as:', userId)
  
  // Join a conversation
  socket.emit('join-room', 'conversation-123')
})
```

### Handling Real-time Messages
```typescript
socket.on('message-new', (message) => {
  // Display new message in UI
  displayMessage(message)
})

socket.on('typing', (userId, conversationId) => {
  // Show typing indicator
  showTypingIndicator(userId, conversationId)
})
```

### Sending Typing Indicators
```typescript
// Start typing
socket.emit('typing-start', conversationId)

// Stop typing (or it will auto-stop after 5 seconds)
socket.emit('typing-stop', conversationId)
```

## Configuration

### Environment Variables
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

### Socket.IO Configuration
- CORS enabled for frontend URL
- Connection timeout: 10 seconds for authentication
- Heartbeat interval: 25 seconds (Socket.IO default)

## Integration with Other Services

### Message Service Integration
The WebSocket gateway integrates with the message service to:
- Broadcast new messages to conversation participants
- Send message acknowledgments to senders
- Handle message editing and deletion events

### User Service Integration
- Validate user permissions for conversation access
- Track user activity and last seen timestamps
- Handle user blocking and privacy settings

### Conversation Service Integration
- Validate conversation membership
- Handle conversation-level permissions
- Support group chat member management

## Monitoring and Observability

### Metrics to Track
- Active WebSocket connections
- Message delivery latency
- Redis connection health
- Error rates by type
- Memory usage per service

### Logging
- Connection/disconnection events
- Authentication attempts
- Room join/leave activities
- Error conditions with context

## Future Enhancements

### Planned Features
- Message encryption for enhanced security
- Voice/video call signaling
- File transfer progress tracking
- Advanced presence states (busy, do not disturb)
- Message reactions and emoji responses

### Performance Optimizations
- Connection pooling for Redis
- Message batching for high-throughput scenarios
- Compression for large message payloads
- Caching frequently accessed presence data