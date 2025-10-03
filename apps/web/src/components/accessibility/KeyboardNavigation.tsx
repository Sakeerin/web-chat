import React, { useEffect, useRef, useCallback } from 'react'
import { useKeyboardNavigation } from '@/hooks/useAccessibility'

interface KeyboardNavigationProps {
  children: React.ReactNode
  items: any[]
  onSelect?: (index: number) => void
  onEscape?: () => void
  className?: string
  role?: string
  ariaLabel?: string
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  children,
  items,
  onSelect,
  onEscape,
  className = '',
  role = 'listbox',
  ariaLabel
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { activeIndex, setActiveIndex } = useKeyboardNavigation(items, onSelect, onEscape)

  // Focus management
  useEffect(() => {
    if (activeIndex >= 0 && containerRef.current) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement
      if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus()
      }
    }
  }, [activeIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [activeIndex, items.length, onSelect, onEscape, setActiveIndex])

  return (
    <div
      ref={containerRef}
      className={className}
      role={role}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            'aria-selected': index === activeIndex,
            'data-active': index === activeIndex,
            tabIndex: index === activeIndex ? 0 : -1,
            role: 'option'
          })
        }
        return child
      })}
    </div>
  )
}

interface NavigableItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export const NavigableItem: React.FC<NavigableItemProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  ...props
}) => {
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick()
    }
  }, [disabled, onClick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      if (onClick) {
        onClick()
      }
    }
  }, [disabled, onClick])

  return (
    <div
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </div>
  )
}