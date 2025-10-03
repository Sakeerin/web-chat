import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { socketService } from '@/services/socket'

export const useSocket = () => {
  const { isAuthenticated, accessToken } = useAuthStore()
  const isInitialized = useRef(false)

  useEffect(() => {
    if (isAuthenticated && accessToken && !isInitialized.current) {
      // Connect to socket
      socketService.connect(accessToken)
      isInitialized.current = true
      
      // Update presence to online
      socketService.updatePresence('online')
    } else if (!isAuthenticated && isInitialized.current) {
      // Disconnect socket when user logs out
      socketService.updatePresence('offline')
      socketService.disconnect()
      isInitialized.current = false
    }

    // Cleanup on unmount
    return () => {
      if (isInitialized.current) {
        socketService.updatePresence('offline')
        socketService.disconnect()
        isInitialized.current = false
      }
    }
  }, [isAuthenticated, accessToken])

  // Handle page visibility changes for presence
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isAuthenticated && socketService.isConnected) {
        if (document.hidden) {
          // Page is hidden, but keep connection alive
          // Could implement away status here
        } else {
          // Page is visible again
          socketService.updatePresence('online')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated])

  // Handle beforeunload to update presence
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isAuthenticated && socketService.isConnected) {
        socketService.updatePresence('offline')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isAuthenticated])

  return {
    isConnected: socketService.isConnected,
    sendMessage: socketService.sendMessage.bind(socketService),
    joinRoom: socketService.joinRoom.bind(socketService),
    leaveRoom: socketService.leaveRoom.bind(socketService),
    startTyping: socketService.startTyping.bind(socketService),
    stopTyping: socketService.stopTyping.bind(socketService),
    markAsRead: socketService.markAsRead.bind(socketService),
  }
}