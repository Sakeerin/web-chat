// PWA Test Setup
import { vi } from 'vitest'

// Mock service worker APIs
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    serviceWorker: {
      register: vi.fn().mockResolvedValue({
        addEventListener: vi.fn(),
        installing: null,
        waiting: null,
        active: null,
        scope: '/',
        update: vi.fn(),
        unregister: vi.fn()
      }),
      ready: Promise.resolve({
        pushManager: {
          subscribe: vi.fn(),
          getSubscription: vi.fn().mockResolvedValue(null)
        },
        sync: {
          register: vi.fn()
        }
      }),
      controller: null,
      addEventListener: vi.fn()
    },
    onLine: true
  },
  writable: true
})

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted')
  },
  writable: true
})

// Mock beforeinstallprompt event
Object.defineProperty(window, 'addEventListener', {
  value: vi.fn(),
  writable: true
})

// Mock location.reload
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: vi.fn()
  },
  writable: true
})