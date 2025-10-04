# Frontend-Only Development Mode

## Overview

The frontend can run independently without the backend API server for UI development. This is useful when:
- Working on component styling and layout
- Testing responsive design
- Developing static pages
- Prototyping new features

## What Works

✅ **UI Components** - All React components render normally
✅ **Routing** - Client-side navigation works
✅ **State Management** - Zustand stores function locally
✅ **Styling** - Tailwind CSS and all styles work
✅ **Hot Reload** - Vite HMR for instant updates
✅ **Static Assets** - Images, icons, fonts load normally

## What Doesn't Work

❌ **Authentication** - Login/register will fail
❌ **API Calls** - All backend requests will timeout
❌ **WebSocket** - Real-time features won't connect
❌ **File Uploads** - Can't upload to S3/MinIO
❌ **Search** - MeiliSearch integration unavailable
❌ **Database Operations** - No data persistence

## Running Frontend Only

```bash
cd apps/web
pnpm install
pnpm dev
```

The app will be available at `http://localhost:5173`

## Expected Warnings

You'll see these warnings in the console - they're normal and won't break the app:

```
CSRF token refresh failed - API server may not be running
Request timeout - API server may be unavailable or database not connected
Service Worker registration failed (expected in dev without API)
Failed to cache (not found): [various URLs]
```

These are handled gracefully and won't prevent the UI from rendering. The Service Worker will still install successfully even if some resources can't be cached.

## Switching to Full Stack

When you need backend functionality:

1. **Start Docker services:**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Start API server:**
   ```bash
   cd apps/api
   pnpm dev
   ```

3. **Refresh your browser** - The frontend will automatically connect

## Development Tips

### Mock Data for UI Development

Create mock data in your components for testing:

```typescript
// Example: Mock conversation data
const mockConversations = [
  {
    id: '1',
    name: 'Team Chat',
    lastMessage: 'Hey, how are you?',
    timestamp: new Date(),
    unreadCount: 3,
  },
  // ... more mock data
];
```

### Conditional API Calls

Check if API is available before making requests:

```typescript
const checkAPIHealth = async () => {
  try {
    const response = await fetch('http://localhost:3001/health', {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
};
```

### Use React Query's Enabled Option

Prevent queries from running when API isn't available:

```typescript
const { data } = useQuery({
  queryKey: ['conversations'],
  queryFn: fetchConversations,
  enabled: isAPIAvailable, // Only run when API is up
});
```

## Troubleshooting

### Port Already in Use

If port 5173 is taken:
```bash
# Kill the process using the port
npx kill-port 5173

# Or specify a different port
pnpm dev --port 5174
```

### Slow Hot Reload

Clear Vite cache:
```bash
rm -rf apps/web/node_modules/.vite
pnpm dev
```

### TypeScript Errors

Rebuild types:
```bash
cd apps/web
pnpm build:types
```

## See Also

- [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - Full stack setup guide
- [README.md](./README.md) - Project overview
- [apps/web/README.md](./apps/web/README.md) - Frontend-specific docs
