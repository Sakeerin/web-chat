import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from '@/lib/queryClient'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PWAProvider } from '@/components/pwa/PWAProvider'
import { SecurityProvider } from '@/components/security/SecurityProvider'
import { SecurityAlerts } from '@/components/security/SecurityAlerts'
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider'
import { I18nProvider } from '@/i18n/components/I18nProvider'
// Removed lazy loading for now to fix loading issues
import { initPerformanceMonitoring } from '@/utils/performance'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'

// Import i18n configuration
import '@/i18n'
// Import RTL styles
import '@/styles/rtl.css'

// Import pages directly for now to avoid lazy loading issues
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import ChatPage from '@/pages/ChatPage'
import ContactsPage from '@/pages/ContactsPage'
import SettingsPage from '@/pages/SettingsPage'
import SearchPage from '@/pages/SearchPage'
import AdminPage from '@/pages/AdminPage'

// Use direct imports for now

function AppContent() {
  // Initialize token refresh mechanism
  useTokenRefresh()

  // Pages are now directly imported, no preloading needed

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Protected routes */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <ContactsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/chat" replace />} />
      
      {/* Catch all - redirect to chat */}
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}

function App() {
  // Initialize performance monitoring
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      initPerformanceMonitoring()
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AccessibilityProvider>
          <SecurityProvider enableRealTimeMonitoring={true} enableSecurityAlerts={true}>
            <Router>
              <PWAProvider>
                <main id="main-content">
                  <AppContent />
                </main>
                
                {/* Security Alerts */}
                <SecurityAlerts position="top-right" maxAlerts={3} />
              </PWAProvider>
            </Router>
          </SecurityProvider>
        </AccessibilityProvider>
      </I18nProvider>
      
      {/* React Query DevTools - only in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App