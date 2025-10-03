import React from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@ui/components/button'
import { Card } from '@ui/components/card'
import { usePWA } from '@/hooks/usePWA'

interface InstallPromptProps {
  onDismiss?: () => void
  className?: string
}

export function InstallPrompt({ onDismiss, className }: InstallPromptProps) {
  const { isInstallable, showInstallPrompt, dismissInstallPrompt } = usePWA()

  if (!isInstallable) {
    return null
  }

  const handleInstall = async () => {
    try {
      await showInstallPrompt()
      onDismiss?.()
    } catch (error) {
      console.error('Failed to show install prompt:', error)
    }
  }

  const handleDismiss = () => {
    dismissInstallPrompt()
    onDismiss?.()
  }

  return (
    <Card className={`p-4 border-blue-200 bg-blue-50 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Install Telegram Chat
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Install our app for a better experience with offline support and push notifications.
            </p>
            <div className="mt-3 flex space-x-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4 mr-1" />
                Install App
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-blue-500 hover:text-blue-700 hover:bg-blue-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}