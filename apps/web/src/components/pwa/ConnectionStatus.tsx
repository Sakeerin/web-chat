import React from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@ui/components/button'
import { usePWA } from '@/hooks/usePWA'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'

interface ConnectionStatusProps {
  className?: string
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const { isOnline } = usePWA()
  const { queuedMessages, isProcessing, retryQueue } = useOfflineQueue()

  if (isOnline && queuedMessages.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 text-sm ${className}`}>
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-700">
            You're offline. Messages will be sent when connection is restored.
          </span>
        </>
      ) : queuedMessages.length > 0 ? (
        <>
          <RefreshCw className={`h-4 w-4 text-yellow-500 ${isProcessing ? 'animate-spin' : ''}`} />
          <span className="text-yellow-700">
            Syncing {queuedMessages.length} message{queuedMessages.length !== 1 ? 's' : ''}...
          </span>
          {!isProcessing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={retryQueue}
              className="text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100 p-1 h-auto"
            >
              Retry
            </Button>
          )}
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-700">Connected</span>
        </>
      )}
    </div>
  )
}