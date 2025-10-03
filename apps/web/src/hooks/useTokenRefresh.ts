import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { apiService, endpoints } from '@/services/api'

interface AuthResponse {
  user: {
    id: string
    username: string
    email: string
    name: string
    avatarUrl?: string
  }
  accessToken: string
  refreshToken: string
  expiresIn: number
}

const TOKEN_REFRESH_THRESHOLD = 2 * 60 * 1000 // 2 minutes before expiry
const CHECK_INTERVAL = 30 * 1000 // Check every 30 seconds

interface TokenPayload {
  exp: number
  iat: number
  userId: string
  sessionId: string
}

const decodeJWT = (token: string): TokenPayload | null => {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

export const useTokenRefresh = () => {
  const { accessToken, refreshToken, setAuth, clearAuth, isAuthenticated } = useAuthStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const refreshingRef = useRef(false)

  const refreshTokens = async () => {
    if (!refreshToken || refreshingRef.current) {
      return
    }

    refreshingRef.current = true

    try {
      const response = await apiService.post(endpoints.auth.refresh, {
        refreshToken,
      }) as AuthResponse

      setAuth(response.user, response.accessToken, response.refreshToken)
    } catch (error) {
      console.error('Token refresh failed:', error)
      clearAuth()
    } finally {
      refreshingRef.current = false
    }
  }

  const checkTokenExpiry = async () => {
    if (!accessToken || !isAuthenticated) {
      return
    }

    const payload = decodeJWT(accessToken)
    if (!payload) {
      clearAuth()
      return
    }

    const now = Date.now()
    const expiryTime = payload.exp * 1000
    const timeUntilExpiry = expiryTime - now

    // If token is expired, clear auth
    if (timeUntilExpiry <= 0) {
      clearAuth()
      return
    }

    // If token expires soon, refresh it
    if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
      await refreshTokens()
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Check immediately
    checkTokenExpiry()

    // Set up periodic checks
    intervalRef.current = setInterval(checkTokenExpiry, CHECK_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isAuthenticated, accessToken, refreshToken])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    refreshTokens,
  }
}