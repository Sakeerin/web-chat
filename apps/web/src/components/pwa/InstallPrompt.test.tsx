import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { InstallPrompt } from './InstallPrompt'

// Mock the usePWA hook
vi.mock('@/hooks/usePWA')
const { usePWA } = await import('@/hooks/usePWA')
const mockUsePWA = usePWA as any

describe('InstallPrompt', () => {
  const mockShowInstallPrompt = vi.fn()
  const mockDismissInstallPrompt = vi.fn()
  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      isOnline: true,
      hasUpdate: false,
      showInstallPrompt: mockShowInstallPrompt,
      dismissInstallPrompt: mockDismissInstallPrompt,
      skipWaiting: vi.fn(),
      requestNotificationPermission: vi.fn(),
      subscribeToPushNotifications: vi.fn(),
      unsubscribeFromPushNotifications: vi.fn()
    })
  })

  it('should render when app is installable', () => {
    render(<InstallPrompt />)

    expect(screen.getByText('Install Telegram Chat')).toBeInTheDocument()
    expect(screen.getByText(/Install our app for a better experience/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Install App/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Not Now/ })).toBeInTheDocument()
  })

  it('should not render when app is not installable', () => {
    mockUsePWA.mockReturnValue({
      isInstallable: false,
      isInstalled: false,
      isOnline: true,
      hasUpdate: false,
      showInstallPrompt: mockShowInstallPrompt,
      dismissInstallPrompt: mockDismissInstallPrompt,
      skipWaiting: vi.fn(),
      requestNotificationPermission: vi.fn(),
      subscribeToPushNotifications: vi.fn(),
      unsubscribeFromPushNotifications: vi.fn()
    })

    const { container } = render(<InstallPrompt />)
    expect(container.firstChild).toBeNull()
  })

  it('should call showInstallPrompt when install button is clicked', async () => {
    mockShowInstallPrompt.mockResolvedValue(undefined)

    render(<InstallPrompt onDismiss={mockOnDismiss} />)

    const installButton = screen.getByRole('button', { name: /Install App/ })
    fireEvent.click(installButton)

    await waitFor(() => {
      expect(mockShowInstallPrompt).toHaveBeenCalled()
      expect(mockOnDismiss).toHaveBeenCalled()
    })
  })

  it('should handle install prompt error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockShowInstallPrompt.mockRejectedValue(new Error('Install failed'))

    render(<InstallPrompt />)

    const installButton = screen.getByRole('button', { name: /Install App/ })
    fireEvent.click(installButton)

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to show install prompt:', expect.any(Error))
    })

    consoleError.mockRestore()
  })

  it('should call dismissInstallPrompt when not now button is clicked', () => {
    render(<InstallPrompt onDismiss={mockOnDismiss} />)

    const notNowButton = screen.getByRole('button', { name: /Not Now/ })
    fireEvent.click(notNowButton)

    expect(mockDismissInstallPrompt).toHaveBeenCalled()
    expect(mockOnDismiss).toHaveBeenCalled()
  })

  it('should call dismissInstallPrompt when close button is clicked', () => {
    render(<InstallPrompt onDismiss={mockOnDismiss} />)

    const closeButton = screen.getByRole('button', { name: '' }) // X button has no accessible name
    fireEvent.click(closeButton)

    expect(mockDismissInstallPrompt).toHaveBeenCalled()
    expect(mockOnDismiss).toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    const { container } = render(<InstallPrompt className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})