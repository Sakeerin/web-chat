import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccessibilityProvider, useAccessibility } from './AccessibilityProvider'

// Test component that uses the accessibility context
const TestComponent: React.FC = () => {
  const { announce, theme, setTheme, prefersReducedMotion, isHighContrast } = useAccessibility()

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="reduced-motion">{prefersReducedMotion.toString()}</div>
      <div data-testid="high-contrast">{isHighContrast.toString()}</div>
      <button onClick={() => announce('Test announcement')}>
        Announce
      </button>
      <button onClick={() => setTheme('dark')}>
        Set Dark Theme
      </button>
    </div>
  )
}

describe('AccessibilityProvider', () => {
  beforeEach(() => {
    // Reset any media query mocks
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  })

  it('provides accessibility context to children', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false')
    expect(screen.getByTestId('high-contrast')).toHaveTextContent('false')
  })

  it('allows theme changes', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    fireEvent.click(screen.getByText('Set Dark Theme'))
    
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    })
  })

  it('creates live region for announcements', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    // Check that live region exists
    const liveRegion = document.querySelector('[aria-live]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
  })

  it('announces messages to screen readers', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    fireEvent.click(screen.getByText('Announce'))

    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live]')
      expect(liveRegion).toHaveTextContent('Test announcement')
    })
  })

  it('detects reduced motion preference', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true')
  })

  it('detects high contrast preference', () => {
    // Mock high contrast preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true')
  })

  it('applies theme attributes to document', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    fireEvent.click(screen.getByText('Set Dark Theme'))

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    })
  })

  it('includes skip to main content link', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    const skipLink = screen.getByText('Skip to main content')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAccessibility must be used within an AccessibilityProvider')

    consoleSpy.mockRestore()
  })
})