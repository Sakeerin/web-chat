import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAriaLive, useReducedMotion, useHighContrast } from '@/hooks/useAccessibility'

interface AccessibilityContextType {
  // Announcement system
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  
  // User preferences
  prefersReducedMotion: boolean
  isHighContrast: boolean
  
  // Theme and contrast
  theme: 'light' | 'dark' | 'high-contrast'
  setTheme: (theme: 'light' | 'dark' | 'high-contrast') => void
  
  // Screen reader detection
  isScreenReaderActive: boolean
  
  // Focus management
  focusMode: 'mouse' | 'keyboard'
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const { announce, LiveRegion } = useAriaLive()
  const prefersReducedMotion = useReducedMotion()
  const isHighContrast = useHighContrast()
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'high-contrast'>('light')
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false)
  const [focusMode, setFocusMode] = useState<'mouse' | 'keyboard'>('mouse')

  // Detect screen reader usage
  useEffect(() => {
    // Check for common screen reader indicators
    const hasScreenReader = !!(
      window.navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack|Dragon/i) ||
      window.speechSynthesis ||
      document.querySelector('[aria-live]')
    )
    
    setIsScreenReaderActive(hasScreenReader)
  }, [])

  // Detect focus mode (keyboard vs mouse)
  useEffect(() => {
    let hadKeyboardEvent = false

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        hadKeyboardEvent = true
        setFocusMode('keyboard')
      }
    }

    const onMouseDown = () => {
      hadKeyboardEvent = false
      setFocusMode('mouse')
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('pointerdown', onMouseDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('pointerdown', onMouseDown, true)
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-focus-mode', focusMode)
    
    if (prefersReducedMotion) {
      root.setAttribute('data-reduced-motion', 'true')
    } else {
      root.removeAttribute('data-reduced-motion')
    }
    
    if (isHighContrast) {
      root.setAttribute('data-high-contrast', 'true')
    } else {
      root.removeAttribute('data-high-contrast')
    }
  }, [theme, focusMode, prefersReducedMotion, isHighContrast])

  // Auto-switch to high contrast theme if system preference is detected
  useEffect(() => {
    if (isHighContrast && theme !== 'high-contrast') {
      setTheme('high-contrast')
    }
  }, [isHighContrast, theme])

  const value: AccessibilityContextType = {
    announce,
    prefersReducedMotion,
    isHighContrast,
    theme,
    setTheme,
    isScreenReaderActive,
    focusMode
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <LiveRegion />
      
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>
    </AccessibilityContext.Provider>
  )
}

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}