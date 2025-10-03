import React, { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../index'
import { useRTL } from '../hooks/useRTL'

interface I18nProviderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * I18n Provider component that wraps the app with internationalization support
 */
export function I18nProvider({ children, fallback }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Initialize i18n if not already initialized
    if (!i18n.isInitialized) {
      i18n
        .init()
        .then(() => {
          setIsInitialized(true)
        })
        .catch((err) => {
          console.error('Failed to initialize i18n:', err)
          setError(err)
          setIsInitialized(true) // Still render with fallback
        })
    } else {
      setIsInitialized(true)
    }
  }, [])

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {fallback || (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading translations...</p>
          </div>
        )}
      </div>
    )
  }

  if (error) {
    console.warn('I18n initialization error, falling back to default language:', error)
  }

  return (
    <I18nextProvider i18n={i18n}>
      <I18nWrapper>
        {children}
      </I18nWrapper>
    </I18nextProvider>
  )
}

/**
 * Internal wrapper component that handles RTL and other i18n-related setup
 */
function I18nWrapper({ children }: { children: React.ReactNode }) {
  // This hook will handle RTL setup and document direction
  useRTL()

  return <>{children}</>
}

/**
 * Hook to check if i18n is ready
 */
export function useI18nReady() {
  const [isReady, setIsReady] = useState(i18n.isInitialized)

  useEffect(() => {
    if (i18n.isInitialized) {
      setIsReady(true)
      return
    }

    const handleInitialized = () => setIsReady(true)
    
    i18n.on('initialized', handleInitialized)
    
    return () => {
      i18n.off('initialized', handleInitialized)
    }
  }, [])

  return isReady
}