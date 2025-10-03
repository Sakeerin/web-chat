import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { usePWA } from './usePWA'

// Mock the PWA service
vi.mock('@/services/pwaService', () => ({
  pwaService: {
    onInstallPromptChange: vi.fn(),
    onConnectionChange: vi.fn(),
    onUpdateAvailable: vi.fn(),
    isOnline: vi.fn(),
    skipWaiting: vi.fn(),
    requestNotificationPermission: vi.fn(),
    subscribeToPushNotifications: vi.fn(),
    unsubscribeFromPushNotifications: vi.fn(),
  }
}))

// Import after mocking
const { pwaService } = await import('@/services/pwaService')
const mockPwaService = pwaService as any

describe('usePWA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPwaService.isOnline.mockReturnValue(true)
    mockPwaService.onInstallPromptChange.mockReturnValue(() => {})
    mockPwaService.onConnectionChange.mockReturnValue(() => {})
    mockPwaService.onUpdateAvailable.mockReturnValue(() => {})
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePWA())

    expect(result.current.isInstallable).toBe(false)
    expect(result.current.isInstalled).toBe(false)
    expect(result.current.isOnline).toBe(true)
    expect(result.current.hasUpdate).toBe(false)
  })

  it('should call pwaService methods on mount', () => {
    renderHook(() => usePWA())

    expect(mockPwaService.onInstallPromptChange).toHaveBeenCalled()
    expect(mockPwaService.onConnectionChange).toHaveBeenCalled()
    expect(mockPwaService.onUpdateAvailable).toHaveBeenCalled()
  })

  it('should update state when install prompt changes', () => {
    let installPromptCallback: (prompt: any) => void = () => {}
    mockPwaService.onInstallPromptChange.mockImplementation((callback) => {
      installPromptCallback = callback
      return () => {}
    })

    const { result } = renderHook(() => usePWA())

    act(() => {
      installPromptCallback({
        isInstallable: true,
        isInstalled: false,
        showInstallPrompt: vi.fn(),
        dismissInstallPrompt: vi.fn()
      })
    })

    expect(result.current.isInstallable).toBe(true)
    expect(result.current.isInstalled).toBe(false)
  })

  it('should update state when connection changes', () => {
    let connectionCallback: (isOnline: boolean) => void = () => {}
    mockPwaService.onConnectionChange.mockImplementation((callback) => {
      connectionCallback = callback
      return () => {}
    })

    const { result } = renderHook(() => usePWA())

    act(() => {
      connectionCallback(false)
    })

    expect(result.current.isOnline).toBe(false)
  })

  it('should update state when update is available', () => {
    let updateCallback: (registration: any) => void = () => {}
    mockPwaService.onUpdateAvailable.mockImplementation((callback) => {
      updateCallback = callback
      return () => {}
    })

    const { result } = renderHook(() => usePWA())

    act(() => {
      updateCallback({} as ServiceWorkerRegistration)
    })

    expect(result.current.hasUpdate).toBe(true)
  })

  it('should call skipWaiting and reload on update', async () => {
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    })

    mockPwaService.skipWaiting.mockResolvedValue()

    const { result } = renderHook(() => usePWA())

    await act(async () => {
      await result.current.skipWaiting()
    })

    expect(mockPwaService.skipWaiting).toHaveBeenCalled()
    expect(mockReload).toHaveBeenCalled()
  })

  it('should delegate notification methods to pwaService', async () => {
    mockPwaService.requestNotificationPermission.mockResolvedValue('granted')
    mockPwaService.subscribeToPushNotifications.mockResolvedValue({} as PushSubscription)
    mockPwaService.unsubscribeFromPushNotifications.mockResolvedValue(true)

    const { result } = renderHook(() => usePWA())

    await result.current.requestNotificationPermission()
    await result.current.subscribeToPushNotifications()
    await result.current.unsubscribeFromPushNotifications()

    expect(mockPwaService.requestNotificationPermission).toHaveBeenCalled()
    expect(mockPwaService.subscribeToPushNotifications).toHaveBeenCalled()
    expect(mockPwaService.unsubscribeFromPushNotifications).toHaveBeenCalled()
  })
})