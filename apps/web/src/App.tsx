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
import { createLazyRoute, withLazyLoading, preloadComponent } from '@/utils/codeSplitting'
import { initPerformanceMonitoring } from '@/utils/performance'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'

// Import i18n configuration
import '@/i18n'
// Import RTL styles
import '@/styles/rtl.css'

// Lazy load pages for better performance
const LoginPage = createLazyRoute(() => import('@/pages/LoginPage'))
const RegisterPage = createLazyRoute(() => import('@/pages/RegisterPage'))
const ForgotPasswordPage = createLazyRoute(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = createLazyRoute(() => import('@/pages/ResetPasswordPage'))
const ChatPage = createLazyRoute(() => import('@/pages/ChatPage'), true) // Preload chat page
const ContactsPage = createLazyRoute(() => import('@/pages/ContactsPage'))
const SettingsPage = createLazyRoute(() => import('@/pages/SettingsPage'))
const SearchPage = createLazyRoute(() => import('@/pages/SearchPage'))
const AdminPage = createLazyRoute(() => import('@/pages/AdminPage'))

// Wrapped lazy components with error boundaries
const LazyLoginPage = withLazyLoading(LoginPage, 'Loading login...')
const LazyRegisterPage = withLazyLoading(RegisterPage, 'Loading registration...')
const LazyForgotPasswordPage = withLazyLoading(ForgotPasswordPage, 'Loading...')
const LazyResetPasswordPage = withLazyLoading(ResetPasswordPage, 'Loading...')
const LazyChatPage = withLazyLoading(ChatPage, 'Loading chat...')
const LazyContactsPage = withLazyLoading(ContactsPage, 'Loading contacts...')
const LazySettingsPage = withLazyLoading(SettingsPage, 'Loading settings...')
const LazySearchPage = withLazyLoading(SearchPage, 'Loading search...')
const LazyAdminPage = withLazyLoading(AdminPage, 'Loading admin panel...')

function AppContent() {
  // Initialize token refresh mechanism
  useTokenRefresh()

  // Preload critical pages on user interaction
  React.useEffect(() => {
    const preloadCriticalPages = () => {
      // Preload contacts and settings pages after a delay
      setTimeout(() => {
        preloadComponent(() => import('@/pages/ContactsPage'))
        preloadComponent(() => import('@/pages/SettingsPage'))
      }, 2000)
    }

    // Preload on user interaction
    const handleUserInteraction = () => {
      preloadCriticalPages()
      document.removeEventListener('mousedown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }

    document.addEventListener('mousedown', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)

    return () => {
      document.removeEventListener('mousedown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LazyLoginPage />} />
      <Route path="/register" element={<LazyRegisterPage />} />
      <Route path="/forgot-password" element={<LazyForgotPasswordPage />} />
      <Route path="/reset-password" element={<LazyResetPasswordPage />} />
      
      {/* Protected routes */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <LazyChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <LazyContactsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <LazySettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <LazySearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <LazyAdminPage />
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