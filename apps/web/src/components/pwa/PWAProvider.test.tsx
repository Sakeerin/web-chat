import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { PWAProvider } from './PWAProvider'

// Mock all PWA hooks and components
vi.mock('@/hooks/usePWA', () => ({
  usePWA: () => ({
    isInstallable: false,
    hasUpdate: false,
    isOnline: true
  })
}))

vi.mock('./InstallPrompt', () => ({
  InstallPrompt: ({ onDismiss }: { onDismiss?: () => void }) => (
    <div data-testid="install-prompt">Install Prompt</div>
  )
}))

vi.mock('./UpdatePrompt', () => ({
  UpdatePrompt: ({ onDismiss }: { onDismiss?: () => void }) => (
    <div data-testid="update-prompt">Update Prompt</div>
  )
}))

vi.mock('./ConnectionStatus', () => ({
  ConnectionStatus: ({ className }: { className?: string }) => (
    <div data-testid="connection-status" className={className}>Connection Status</div>
  )
}))

describe('PWAProvider', () => {
  it('should render children', () => {
    render(
      <PWAProvider>
        <div data-testid="child">Test Child</div>
      </PWAProvider>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should render connection status', () => {
    render(
      <PWAProvider>
        <div>Test</div>
      </PWAProvider>
    )

    expect(screen.getByTestId('connection-status')).toBeInTheDocument()
  })

  it('should apply correct classes to connection status', () => {
    render(
      <PWAProvider>
        <div>Test</div>
      </PWAProvider>
    )

    const connectionStatus = screen.getByTestId('connection-status')
    expect(connectionStatus).toHaveClass('bg-yellow-50', 'border-b', 'border-yellow-200')
  })
})