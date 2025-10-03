import React from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@ui/components/button'
import { Card } from '@ui/components/card'
import { usePWA } from '@/hooks/usePWA'

interface UpdatePromptProps {
  onDismiss?: () => void
  className?: string
}

export function UpdatePrompt({ onDismiss, className }: UpdatePromptProps) {
  const { hasUpdate, skipWaiting } = usePWA()

  if (!hasUpdate) {
    return null
  }

  const handleUpdate = async () => {
    try {
      await skipWaiting()
      onDismiss?.()
    } catch (error) {
      console.error('Failed to update app:', error)
    }
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  return (
    <Card className={`p-4 border-green-200 bg-green-50 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <RefreshCw className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-900">
              App Update Available
            </h3>
            <p className="mt-1 text-sm text-green-700">
              A new version of the app is available with improvements and bug fixes.
            </p>
            <div className="mt-3 flex space-x-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Update Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-green-500 hover:text-green-700 hover:bg-green-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}