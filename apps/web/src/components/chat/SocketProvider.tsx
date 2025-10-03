import React, { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

import { socketService } from '@/services/socket'

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuthStore()


  useEffect(() => {
    if (isAuthenticated && accessToken) {
      // Connect to WebSocket
      socketService.connect(accessToken)
      
      // Update presence to online
      socketService.updatePresence('online')
      
      return () => {
        // Update presence to offline before disconnecting
        socketService.updatePresence('offline')
        socketService.disconnect()
      }
    } else {
      // Disconnect if not authenticated
      socketService.disconnect()
    }
    return undefined
  }, [isAuthenticated, accessToken])

  // Handle page visibility changes for presence
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        socketService.updatePresence('offline')
      } else {
        socketService.updatePresence('online')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Handle beforeunload to update presence
  useEffect(() => {
    const handleBeforeUnload = () => {
      socketService.updatePresence('offline')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return <>{children}</>
}