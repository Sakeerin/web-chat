// PWA Service for managing Progressive Web App functionality
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export interface PWAInstallPrompt {
  isInstallable: boolean
  isInstalled: boolean
  showInstallPrompt: () => Promise<void>
  dismissInstallPrompt: () => void
}

class PWAService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private installPromptCallbacks: Set<(prompt: PWAInstallPrompt) => void> = new Set()
  private updateCallbacks: Set<(registration: ServiceWorkerRegistration) => void> = new Set()

  constructor() {
    this.init()
  }

  private init() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e as BeforeInstallPromptEvent
      this.notifyInstallPromptListeners()
    })

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed')
      this.deferredPrompt = null
      this.notifyInstallPromptListeners()
    })

    // Register service worker
    this.registerServiceWorker()
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        console.log('Service Worker registered:', registration)

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                this.notifyUpdateListeners(registration)
              }
            })
          }
        })

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event)
        })

        return registration
      } catch (error) {
        // In development, service worker errors are expected when API isn't running
        if (import.meta.env.DEV) {
          console.warn('Service Worker registration failed (expected in dev without API):', error)
        } else {
          console.error('Service Worker registration failed:', error)
        }
        // Don't throw - allow app to continue without SW
        return null
      }
    } else {
      throw new Error('Service Worker not supported')
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data

    switch (type) {
      case 'MESSAGE_SYNCED':
        // Handle message sync completion
        window.dispatchEvent(new CustomEvent('message-synced', { detail: data }))
        break
      case 'NOTIFICATION_CLICKED':
        // Handle notification click
        window.dispatchEvent(new CustomEvent('notification-clicked', { detail: data }))
        break
      default:
        console.log('Unknown service worker message:', type, data)
    }
  }

  // Install prompt management
  public onInstallPromptChange(callback: (prompt: PWAInstallPrompt) => void) {
    this.installPromptCallbacks.add(callback)
    
    // Immediately call with current state
    callback(this.getInstallPrompt())
    
    return () => {
      this.installPromptCallbacks.delete(callback)
    }
  }

  private notifyInstallPromptListeners() {
    const prompt = this.getInstallPrompt()
    this.installPromptCallbacks.forEach(callback => callback(prompt))
  }

  private getInstallPrompt(): PWAInstallPrompt {
    return {
      isInstallable: !!this.deferredPrompt,
      isInstalled: this.isAppInstalled(),
      showInstallPrompt: this.showInstallPrompt.bind(this),
      dismissInstallPrompt: this.dismissInstallPrompt.bind(this)
    }
  }

  private async showInstallPrompt(): Promise<void> {
    if (!this.deferredPrompt) {
      throw new Error('No install prompt available')
    }

    try {
      await this.deferredPrompt.prompt()
      const choiceResult = await this.deferredPrompt.userChoice
      
      console.log('Install prompt result:', choiceResult.outcome)
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      this.deferredPrompt = null
      this.notifyInstallPromptListeners()
    } catch (error) {
      console.error('Error showing install prompt:', error)
      throw error
    }
  }

  private dismissInstallPrompt(): void {
    this.deferredPrompt = null
    this.notifyInstallPromptListeners()
  }

  private isAppInstalled(): boolean {
    // Check if app is running in standalone mode
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true
  }

  // Service worker update management
  public onUpdateAvailable(callback: (registration: ServiceWorkerRegistration) => void) {
    this.updateCallbacks.add(callback)
    
    return () => {
      this.updateCallbacks.delete(callback)
    }
  }

  private notifyUpdateListeners(registration: ServiceWorkerRegistration) {
    this.updateCallbacks.forEach(callback => callback(registration))
  }

  public async skipWaiting(): Promise<void> {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  // Push notifications
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported')
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.ready
    
    if (!registration.pushManager) {
      throw new Error('Push notifications not supported')
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // In production, this should be your VAPID public key
          process.env.VITE_VAPID_PUBLIC_KEY || ''
        ) as BufferSource
      })

      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      throw error
    }
  }

  public async unsubscribeFromPushNotifications(): Promise<boolean> {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      return await subscription.unsubscribe()
    }
    
    return true
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Offline message queue
  public async queueOfflineMessage(message: any, _token: string): Promise<void> {
    // In a real implementation, this would use IndexedDB
    console.log('Queuing offline message:', message)
    
    // Request background sync
    if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready
      await (registration as any).sync.register('sync-messages')
    }
  }

  // Connection status
  public isOnline(): boolean {
    return navigator.onLine
  }

  public onConnectionChange(callback: (isOnline: boolean) => void) {
    const handleOnline = () => callback(true)
    const handleOffline = () => callback(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Call immediately with current status
    callback(this.isOnline())

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }
}

// Export singleton instance
export const pwaService = new PWAService()