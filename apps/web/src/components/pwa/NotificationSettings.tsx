import React, { useState, useEffect } from 'react'
import { Bell, BellOff, Check, X } from 'lucide-react'
import { Button } from '@ui/components/button'
import { Card } from '@ui/components/card'
import { usePWA } from '@/hooks/usePWA'

interface NotificationSettingsProps {
  className?: string
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { requestNotificationPermission, subscribeToPushNotifications, unsubscribeFromPushNotifications } = usePWA()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Check if already subscribed to push notifications
    checkSubscriptionStatus()
  }, [])

  const checkSubscriptionStatus = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      } catch (error) {
        console.error('Failed to check subscription status:', error)
      }
    }
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    try {
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)

      if (newPermission === 'granted') {
        const subscription = await subscribeToPushNotifications()
        setIsSubscribed(!!subscription)
        
        // TODO: Send subscription to backend
        console.log('Push subscription:', subscription)
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)
    try {
      const success = await unsubscribeFromPushNotifications()
      if (success) {
        setIsSubscribed(false)
        // TODO: Remove subscription from backend
      }
    } catch (error) {
      console.error('Failed to disable notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!('Notification' in window)) {
    return null
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {permission === 'granted' && isSubscribed ? (
            <Bell className="h-6 w-6 text-green-600" />
          ) : (
            <BellOff className="h-6 w-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            Push Notifications
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {permission === 'granted' && isSubscribed
              ? 'You\'ll receive notifications for new messages.'
              : permission === 'denied'
              ? 'Notifications are blocked. Enable them in your browser settings.'
              : 'Enable notifications to stay updated with new messages.'}
          </p>
          
          <div className="mt-3 flex space-x-2">
            {permission === 'denied' ? (
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <X className="h-4 w-4" />
                <span>Blocked in browser settings</span>
              </div>
            ) : permission === 'granted' && isSubscribed ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Enabled</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisableNotifications}
                  disabled={isLoading}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Disable
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Bell className="h-4 w-4 mr-1" />
                {isLoading ? 'Enabling...' : 'Enable Notifications'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}