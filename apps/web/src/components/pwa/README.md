# Progressive Web App (PWA) Implementation

This directory contains the Progressive Web App implementation for the Telegram Web Chat application.

## Features Implemented

### 1. Service Worker (`/public/sw.js`)
- **Offline functionality** with cache-first and network-first strategies
- **Background sync** for offline message queue
- **Push notification** handling
- **App update** management
- **Static asset caching** for improved performance

### 2. PWA Manifest (`/public/manifest.json`)
- **App metadata** with proper icons and descriptions
- **Installation shortcuts** for quick actions
- **Screenshots** for app store listings
- **Theme colors** and display modes

### 3. React Components

#### `InstallPrompt`
- Shows installation prompt when app is installable
- Handles user interaction with install/dismiss actions
- Automatically appears after 5 seconds delay

#### `ConnectionStatus`
- Displays current connection status (online/offline)
- Shows offline message queue status
- Provides retry functionality for failed syncs

#### `UpdatePrompt`
- Notifies users when app updates are available
- Allows immediate update installation
- Handles service worker update lifecycle

#### `NotificationSettings`
- Manages push notification permissions
- Handles subscription/unsubscription
- Shows current notification status

#### `PWAProvider`
- Wraps the app with PWA functionality
- Manages global PWA state and prompts
- Provides consistent PWA experience

### 4. React Hooks

#### `usePWA`
- Main hook for PWA functionality
- Provides install, update, and notification methods
- Manages connection status and app state

#### `useOfflineQueue`
- Handles offline message queuing
- Syncs messages when connection is restored
- Persists queue in localStorage

### 5. PWA Service (`pwaService.ts`)
- **Service worker registration** and management
- **Install prompt** handling with beforeinstallprompt event
- **Push notification** subscription management
- **Background sync** for offline messages
- **Connection status** monitoring

## Usage

### Basic Setup

The PWA functionality is automatically initialized when the app starts. The `PWAProvider` component should wrap your main app:

```tsx
import { PWAProvider } from '@/components/pwa/PWAProvider'

function App() {
  return (
    <PWAProvider>
      <YourAppContent />
    </PWAProvider>
  )
}
```

### Using PWA Hooks

```tsx
import { usePWA } from '@/hooks/usePWA'

function MyComponent() {
  const { 
    isInstallable, 
    isOnline, 
    showInstallPrompt,
    requestNotificationPermission 
  } = usePWA()

  // Use PWA functionality
}
```

### Offline Message Queue

```tsx
import { useOfflineQueue } from '@/hooks/useOfflineQueue'

function ChatComponent() {
  const { queueMessage, queuedMessages } = useOfflineQueue()

  const sendMessage = async (message) => {
    if (!navigator.onLine) {
      await queueMessage(message)
    } else {
      // Send normally
    }
  }
}
```

## Configuration

### Environment Variables

```env
# VAPID key for push notifications
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key

# App metadata
VITE_APP_NAME=Telegram Web Chat
VITE_APP_SHORT_NAME=TelegramChat
```

### Service Worker Caching Strategy

- **Static assets**: Cache First (CSS, JS, images)
- **API calls**: Network First with cache fallback
- **HTML pages**: Network First with offline fallback

## Testing

Run PWA-specific tests:

```bash
# Test PWA hooks
npm test usePWA.test.ts

# Test PWA components
npm test InstallPrompt.test.tsx
```

## Browser Support

- **Chrome/Edge**: Full PWA support including installation
- **Firefox**: Service worker and offline functionality
- **Safari**: Limited PWA support, no installation prompt
- **Mobile browsers**: Push notifications and offline support

## Production Considerations

1. **HTTPS Required**: PWA features require secure context
2. **VAPID Keys**: Generate proper VAPID keys for push notifications
3. **Icons**: Replace placeholder icons with actual app icons
4. **Caching Strategy**: Adjust cache TTL based on your needs
5. **Background Sync**: Implement proper IndexedDB for message queue
6. **Push Server**: Set up backend push notification service

## Security

- Service worker runs in secure context only
- Push notifications require user permission
- Background sync respects user privacy settings
- Offline data is stored locally and encrypted where possible

## Performance

- Service worker caches reduce network requests
- Offline functionality improves perceived performance
- Background sync prevents message loss
- Virtual scrolling handles large message lists efficiently

## Debugging

Use Chrome DevTools:
1. **Application tab** → Service Workers
2. **Application tab** → Manifest
3. **Network tab** → Offline simulation
4. **Console** → Service worker logs