import React, { useState, useEffect } from 'react'
import { InstallPrompt } from './InstallPrompt'
import { UpdatePrompt } from './UpdatePrompt'
import { ConnectionStatus } from './ConnectionStatus'
import { usePWA } from '@/hooks/usePWA'

interface PWAProviderProps {
  children: React.ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { isInstallable, hasUpdate } = usePWA()
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  // Show install prompt after a delay if app is installable
  useEffect(() => {
    if (isInstallable) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true)
      }, 5000) // Show after 5 seconds

      return () => clearTimeout(timer)
    }
    return undefined
  }, [isInstallable])

  // Show update prompt when update is available
  useEffect(() => {
    if (hasUpdate) {
      setShowUpdatePrompt(true)
    }
  }, [hasUpdate])

  return (
    <>
      {children}
      
      {/* Connection status bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <ConnectionStatus className="bg-yellow-50 border-b border-yellow-200" />
      </div>

      {/* PWA prompts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-4 max-w-sm">
        {showUpdatePrompt && (
          <UpdatePrompt onDismiss={() => setShowUpdatePrompt(false)} />
        )}
        
        {showInstallPrompt && (
          <InstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
        )}
      </div>
    </>
  )
}