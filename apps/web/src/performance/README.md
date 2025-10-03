# Performance Optimization Implementation

This document outlines the performance optimization features implemented for the Telegram-like web chat application.

## Overview

The performance optimization implementation includes:

1. **React Query Caching Strategies** - Advanced caching with different TTL for different data types
2. **Image Lazy Loading** - Intersection Observer-based lazy loading for images and media
3. **Code Splitting** - Route-based and component-based code splitting with lazy loading
4. **Virtual Scrolling** - Efficient rendering of large lists (messages, conversations)
5. **Memoization** - Advanced memoization hooks for expensive computations
6. **Bundle Analysis** - Tools for analyzing and optimizing bundle size
7. **Performance Monitoring** - Real-time performance tracking and Web Vitals monitoring

## Features Implemented

### 1. Enhanced React Query Caching (`/src/lib/queryClient.ts`)

```typescript
// Different cache strategies for different data types
const CACHE_CONFIG = {
  static: { staleTime: 30 * 60 * 1000, cacheTime: 60 * 60 * 1000 },
  profile: { staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 },
  chat: { staleTime: 2 * 60 * 1000, cacheTime: 15 * 60 * 1000 },
  realtime: { staleTime: 30 * 1000, cacheTime: 2 * 60 * 1000 },
  search: { staleTime: 5 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
}
```

**Features:**
- Smart retry logic (no retry on 4xx errors)
- Offline-first network mode
- Cache warming for frequently accessed data
- Advanced cache utilities for invalidation and prefetching

### 2. Lazy Image Loading (`/src/hooks/useLazyImage.ts`, `/src/components/ui/LazyImage.tsx`)

```typescript
const { src, isLoading, isError, ref } = useLazyImage({
  src: imageUrl,
  threshold: 0.1,
  rootMargin: '50px',
})
```

**Features:**
- Intersection Observer-based loading
- Configurable threshold and root margin
- Loading states and error handling
- Specialized components: `LazyAvatar`, `LazyThumbnail`
- Batch loading for image lists

### 3. Code Splitting (`/src/utils/codeSplitting.tsx`)

```typescript
// Route-based lazy loading
const ChatPage = createLazyRoute(() => import('@/pages/ChatPage'), true)
const LazyComponent = withLazyLoading(ChatPage, 'Loading chat...')

// Component-based lazy loading
const HeavyComponent = createLazyComponent(() => import('./HeavyComponent'))
```

**Features:**
- Route-based code splitting with preloading
- Component-based lazy loading
- Error boundaries for lazy components
- Intersection-based lazy loading
- Preloading strategies

### 4. Virtual Scrolling (`/src/hooks/useVirtualScroll.ts`)

```typescript
const { virtualItems, totalSize, scrollToIndex } = useVirtualScroll({
  itemHeight: 72,
  containerHeight: 400,
  itemCount: messages.length,
  overscan: 5,
})
```

**Features:**
- Fixed and dynamic item heights
- Smooth scrolling with performance optimization
- Overscan for better UX
- Scroll-to-index functionality
- Memory-efficient rendering

### 5. Advanced Memoization (`/src/hooks/useMemoization.ts`)

```typescript
// Deep comparison memoization
const memoizedValue = useDeepMemo(() => expensiveComputation(data), [data])

// Debounced values
const debouncedSearch = useDebounce(searchQuery, 300)

// Throttled callbacks
const throttledHandler = useThrottle(handleScroll, 100)
```

**Features:**
- Deep comparison memoization
- Debounced and throttled hooks
- Expensive computation caching
- Async memoization
- Performance monitoring integration

### 6. Bundle Analysis (`/scripts/analyze-bundle.js`)

```bash
npm run analyze          # Basic bundle analysis
npm run analyze:detailed # Detailed analysis with webpack-bundle-analyzer
npm run size-check       # Build and analyze in one command
```

**Features:**
- Bundle size analysis with performance budgets
- Asset categorization and optimization suggestions
- Chunk size warnings
- Performance budget enforcement
- Detailed reporting

### 7. Performance Monitoring (`/src/utils/performance.ts`)

```typescript
const monitor = PerformanceMonitor.getInstance()

// Function measurement
const measuredFn = monitor.measureFunction('api-call', apiFunction)

// Custom metrics
const endMeasure = monitor.startMeasure('custom-operation')
// ... operation
endMeasure()

// Web Vitals monitoring
monitor.monitorWebVitals()
```

**Features:**
- Function execution time measurement
- Web Vitals monitoring (LCP, FID, CLS)
- Resource loading monitoring
- Memory usage tracking
- Automatic performance reporting

## Performance Optimizations Applied

### MessageList Component
- **Virtual scrolling** for large message lists
- **Dynamic height calculation** for variable message sizes
- **Intersection-based loading** for message content
- **Optimistic updates** with React Query
- **Memoized renders** to prevent unnecessary re-renders

### ConversationList Component
- **Virtual scrolling** for large conversation lists
- **Debounced search** to reduce API calls
- **Lazy loading** for conversation avatars
- **Smart pagination** with intersection detection

### App-wide Optimizations
- **Route-based code splitting** with preloading
- **Component lazy loading** for heavy components
- **Image lazy loading** throughout the app
- **Performance monitoring** for all critical operations
- **Bundle optimization** with smart chunking

## Performance Budgets

The following performance budgets are enforced:

```javascript
const PERFORMANCE_BUDGETS = {
  total: 2000,      // Total bundle size (KB)
  javascript: 1200, // JavaScript size (KB)
  css: 200,         // CSS size (KB)
  images: 500,      // Images size (KB)
  fonts: 100,       // Fonts size (KB)
}
```

## Bundle Optimization

### Chunk Strategy
- **React vendor chunk** - React and React DOM
- **Query vendor chunk** - React Query
- **Socket vendor chunk** - Socket.IO client
- **UI vendor chunk** - Radix UI components
- **Pages chunk** - Route components
- **Components chunk** - Reusable components
- **Utils chunk** - Utilities and hooks

### Build Optimizations
- **Terser minification** with console.log removal in production
- **Tree shaking** for unused code elimination
- **Asset inlining** for small files (< 4KB)
- **Source maps** for debugging
- **Gzip compression** ready

## Monitoring and Analytics

### Metrics Tracked
- **Web Vitals**: LCP, FID, CLS, TTFB
- **Custom metrics**: API response times, render times
- **Resource loading**: Script, stylesheet, image, API timings
- **Memory usage**: Heap size monitoring
- **User interactions**: Click, scroll, navigation timings

### Performance Alerts
- **Slow operations** (> 100ms) are logged
- **Bundle size violations** fail the build
- **Performance regression** detection in CI/CD
- **Real-time monitoring** in production

## Usage Examples

### Lazy Loading Images
```tsx
import { LazyImage, LazyAvatar } from '@/components/ui/LazyImage'

// Basic lazy image
<LazyImage 
  src={imageUrl} 
  alt="Description"
  className="w-full h-auto"
/>

// Avatar with fallback
<LazyAvatar 
  src={user.avatarUrl} 
  alt={user.name}
  size="lg"
/>
```

### Virtual Scrolling
```tsx
import { useVirtualScroll } from '@/hooks/useVirtualScroll'

const { virtualItems, totalSize } = useVirtualScroll({
  itemHeight: 60,
  containerHeight: 400,
  itemCount: items.length,
})

return (
  <div style={{ height: totalSize }}>
    {virtualItems.map(item => (
      <div key={item.index} style={{ 
        position: 'absolute',
        top: item.start,
        height: item.size 
      }}>
        {renderItem(items[item.index])}
      </div>
    ))}
  </div>
)
```

### Performance Monitoring
```tsx
import { usePerformanceMonitor } from '@/utils/performance'

const { measureFunction, recordMetric } = usePerformanceMonitor()

// Measure function performance
const optimizedHandler = measureFunction('button-click', handleClick)

// Record custom metrics
recordMetric('user-action', Date.now() - startTime)
```

## Best Practices

1. **Use virtual scrolling** for lists with > 100 items
2. **Implement lazy loading** for images and heavy components
3. **Debounce search inputs** to reduce API calls
4. **Memoize expensive computations** and renders
5. **Monitor performance metrics** in development and production
6. **Keep bundle sizes** within defined budgets
7. **Preload critical resources** for better UX
8. **Use code splitting** for non-critical features

## Testing

Performance optimizations are tested with:
- **Unit tests** for hooks and utilities
- **Integration tests** for component performance
- **Load tests** for virtual scrolling with large datasets
- **Bundle analysis** in CI/CD pipeline
- **Performance regression tests** for critical paths

## Future Enhancements

1. **Service Worker caching** for offline performance
2. **WebAssembly** for CPU-intensive operations
3. **Web Workers** for background processing
4. **HTTP/2 push** for critical resources
5. **Advanced prefetching** based on user behavior
6. **Performance budgets** per route/feature
7. **Real User Monitoring (RUM)** integration