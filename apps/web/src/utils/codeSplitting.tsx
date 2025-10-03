import React, { Suspense, ComponentType } from 'react'

// Loading component for lazy-loaded routes
export const RouteLoader: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
)

// Error boundary for lazy-loaded components
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class LazyLoadErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{ error?: Error }> }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ComponentType<{ error?: Error }> }>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} />
    }

    return this.props.children
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h2 className="text-xl font-semibold text-red-600 mb-2">
        Failed to load component
      </h2>
      <p className="text-gray-600 mb-4">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Reload Page
      </button>
    </div>
  </div>
)

// Higher-order component for lazy loading with error boundary
export const withLazyLoading = <P extends object>(
  Component: React.LazyExoticComponent<ComponentType<P>>,
  loadingMessage?: string,
  ErrorFallback?: React.ComponentType<{ error?: Error }>
) => {
  return (props: P) => (
    <LazyLoadErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<RouteLoader message={loadingMessage} />}>
        <Component {...props} />
      </Suspense>
    </LazyLoadErrorBoundary>
  )
}

// Preload utility for better UX
export const preloadComponent = (componentImport: () => Promise<any>) => {
  const componentImportWrapper = componentImport
  componentImportWrapper()
}

// Route-based code splitting utilities
export const createLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  preload = false
) => {
  const LazyComponent = React.lazy(importFn)
  
  if (preload) {
    // Preload after a short delay to not block initial render
    setTimeout(() => preloadComponent(importFn), 100)
  }
  
  return LazyComponent
}

// Component-based code splitting for heavy components
export const createLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = React.lazy(importFn)
  
  return (props: P) => (
    <Suspense fallback={fallback || <div className="animate-pulse bg-gray-200 rounded h-20" />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

// Intersection observer based lazy loading for components
export const createIntersectionLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: IntersectionObserverInit = {}
) => {
  return (props: P) => {
    const [shouldLoad, setShouldLoad] = React.useState(false)
    const ref = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        },
        { threshold: 0.1, ...options }
      )

      if (ref.current) {
        observer.observe(ref.current)
      }

      return () => observer.disconnect()
    }, [])

    if (!shouldLoad) {
      return (
        <div 
          ref={ref} 
          className="animate-pulse bg-gray-200 rounded h-20"
          aria-label="Loading component..."
        />
      )
    }

    const LazyComponent = React.lazy(importFn)
    
    return (
      <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded h-20" />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}