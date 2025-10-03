import { useState, useEffect, useCallback } from 'react'
import { pwaService } from '@/services/pwaService'
import { useAuth } from '@/hooks/useAuth'

export interface OfflineMessage {
  id: string
  conversationId: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  timestamp: Date
  tempId: string
  attachments?: any[]
}

export interface OfflineQueueState {
  queuedMessages: OfflineMessage[]
  isProcessing: boolean
  queueMessage: (message: Omit<OfflineMessage, 'id' | 'timestamp'>) => Promise<void>
  clearQueue: () => void
  retryQueue: () => Promise<void>
}

export function useOfflineQueue(): OfflineQueueState {
  const [queuedMessages, setQueuedMessages] = useState<OfflineMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useAuth()
  const token = 'dummy-token' // TODO: Get actual token from auth store

  // Load queued messages from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('offline-message-queue')
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue)
        setQueuedMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      } catch (error) {
        console.error('Failed to parse offline message queue:', error)
        localStorage.removeItem('offline-message-queue')
      }
    }
  }, [])

  // Save queued messages to localStorage whenever queue changes
  useEffect(() => {
    if (queuedMessages.length > 0) {
      localStorage.setItem('offline-message-queue', JSON.stringify(queuedMessages))
    } else {
      localStorage.removeItem('offline-message-queue')
    }
  }, [queuedMessages])

  // Listen for connection changes and process queue when online
  useEffect(() => {
    const unsubscribe = pwaService.onConnectionChange((isOnline) => {
      if (isOnline && queuedMessages.length > 0) {
        retryQueue()
      }
    })

    return unsubscribe
  }, [queuedMessages.length])

  // Listen for message sync events from service worker
  useEffect(() => {
    const handleMessageSynced = (event: CustomEvent) => {
      const { messageId } = event.detail
      setQueuedMessages(prev => prev.filter(msg => msg.id !== messageId))
    }

    window.addEventListener('message-synced', handleMessageSynced as EventListener)

    return () => {
      window.removeEventListener('message-synced', handleMessageSynced as EventListener)
    }
  }, [])

  const queueMessage = useCallback(async (message: Omit<OfflineMessage, 'id' | 'timestamp'>) => {
    const queuedMessage: OfflineMessage = {
      ...message,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    setQueuedMessages(prev => [...prev, queuedMessage])

    // If online, try to send immediately
    if (pwaService.isOnline() && token) {
      try {
        await pwaService.queueOfflineMessage(queuedMessage, token)
      } catch (error) {
        console.error('Failed to queue message for sync:', error)
      }
    }
  }, [token])

  const clearQueue = useCallback(() => {
    setQueuedMessages([])
    localStorage.removeItem('offline-message-queue')
  }, [])

  const retryQueue = useCallback(async () => {
    if (!token || queuedMessages.length === 0 || isProcessing) {
      return
    }

    setIsProcessing(true)

    try {
      // Process messages one by one
      for (const message of queuedMessages) {
        try {
          await pwaService.queueOfflineMessage(message, token)
        } catch (error) {
          console.error('Failed to retry message:', message.id, error)
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }, [token, queuedMessages, isProcessing])

  return {
    queuedMessages,
    isProcessing,
    queueMessage,
    clearQueue,
    retryQueue
  }
}