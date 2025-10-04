import React, { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Hook for managing focus within a component
 */
export const useFocusManagement = () => {
  const focusableElementsSelector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ')

  const getFocusableElements = useCallback((container: HTMLElement) => {
    return Array.from(container.querySelectorAll(focusableElementsSelector)) as HTMLElement[]
  }, [focusableElementsSelector])

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    
    // Focus first element
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [getFocusableElements])

  return {
    getFocusableElements,
    trapFocus
  }
}

/**
 * Hook for managing ARIA live regions
 */
export const useAriaLive = () => {
  const liveRegionRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return

    // Clear previous message
    liveRegionRef.current.textContent = ''
    
    // Set new message with a slight delay to ensure screen readers pick it up
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.setAttribute('aria-live', priority)
        liveRegionRef.current.textContent = message
      }
    }, 100)
  }, [])

  const LiveRegion = useCallback(() => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  ), [])

  return {
    announce,
    LiveRegion
  }
}

/**
 * Hook for keyboard navigation
 */
export const useKeyboardNavigation = (
  items: any[],
  onSelect?: (index: number) => void,
  onEscape?: () => void
) => {
  const [activeIndex, setActiveIndex] = useState(-1)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => prev <= 0 ? items.length - 1 : prev - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (activeIndex >= 0 && onSelect) {
          onSelect(activeIndex)
        }
        break
      case 'Escape':
        e.preventDefault()
        if (onEscape) {
          onEscape()
        }
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(items.length - 1)
        break
    }
  }, [items.length, activeIndex, onSelect, onEscape])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown
  }
}

/**
 * Hook for managing reduced motion preferences
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Hook for managing high contrast mode
 */
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isHighContrast
}

/**
 * Hook for managing focus visible state
 */
export const useFocusVisible = () => {
  const [isFocusVisible, setIsFocusVisible] = useState(false)

  useEffect(() => {
    let hadKeyboardEvent = false

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey || e.ctrlKey) return
      hadKeyboardEvent = true
    }

    const onPointerDown = () => {
      hadKeyboardEvent = false
    }

    const onFocus = () => {
      setIsFocusVisible(hadKeyboardEvent)
    }

    const onBlur = () => {
      setIsFocusVisible(false)
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('mousedown', onPointerDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('touchstart', onPointerDown, true)
    document.addEventListener('focus', onFocus, true)
    document.addEventListener('blur', onBlur, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('mousedown', onPointerDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('touchstart', onPointerDown, true)
      document.removeEventListener('focus', onFocus, true)
      document.removeEventListener('blur', onBlur, true)
    }
  }, [])

  return isFocusVisible
}