import { useState, useEffect } from 'react'
import { pwaService, type PWAInstallPrompt } from '@/services/pwaService'

export interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  hasUpdate: boolean
  showInstallPrompt: () => Promise<void>
  dismissInstallPrompt: () => void
  skipWaiting: () => Promise<void>
  requestNotificationPermission: () => Promise<NotificationPermission>
  subscribeToPushNotifications: () => Promise<PushSubscription | null>
  unsubscribeFromPushNotifications: () => Promise<boolean>
}

export function usePWA(): PWAState {
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt>({
    isInstallable: false,
    isInstalled: false,
    showInstallPrompt: async () => {},
    dismissInstallPrompt: () => {}
  })
  const [isOnline, setIsOnline] = useState(pwaService.isOnline())
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    // Listen for install prompt changes
    const unsubscribeInstall = pwaService.onInstallPromptChange(setInstallPrompt)

    // Listen for connection changes
    const unsubscribeConnection = pwaService.onConnectionChange(setIsOnline)

    // Listen for service worker updates
    const unsubscribeUpdate = pwaService.onUpdateAvailable(() => {
      setHasUpdate(true)
    })

    return () => {
      unsubscribeInstall()
      unsubscribeConnection()
      unsubscribeUpdate()
    }
  }, [])

  const skipWaiting = async () => {
    await pwaService.skipWaiting()
    setHasUpdate(false)
    // Reload the page to activate the new service worker
    window.location.reload()
  }

  return {
    isInstallable: installPrompt.isInstallable,
    isInstalled: installPrompt.isInstalled,
    isOnline,
    hasUpdate,
    showInstallPrompt: installPrompt.showInstallPrompt,
    dismissInstallPrompt: installPrompt.dismissInstallPrompt,
    skipWaiting,
    requestNotificationPermission: pwaService.requestNotificationPermission.bind(pwaService),
    subscribeToPushNotifications: pwaService.subscribeToPushNotifications.bind(pwaService),
    unsubscribeFromPushNotifications: pwaService.unsubscribeFromPushNotifications.bind(pwaService)
  }
}