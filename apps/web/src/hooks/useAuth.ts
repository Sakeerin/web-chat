import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { apiService, endpoints } from '@/services/api'

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  username: string
  name: string
}

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

interface SessionData {
  id: string
  deviceType: string
  deviceId: string
  ipAddress: string
  userAgent: string
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}

interface PasswordResetRequest {
  email: string
}

interface PasswordReset {
  token: string
  newPassword: string
}

export const useAuth = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { setAuth, clearAuth, isAuthenticated, user } = useAuthStore()

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData): Promise<AuthResponse> => {
      return apiService.post(endpoints.auth.login, data)
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      
      // Redirect to intended page or chat
      const from = location.state?.from?.pathname || '/chat'
      navigate(from, { replace: true })
    },
    onError: (error) => {
      console.error('Login failed:', error)
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData): Promise<AuthResponse> => {
      return apiService.post(endpoints.auth.register, data)
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate('/chat', { replace: true })
    },
    onError: (error) => {
      console.error('Registration failed:', error)
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async (sessionId?: string) => {
      return apiService.post(endpoints.auth.logout, { sessionId })
    },
    onSuccess: () => {
      clearAuth()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
    onError: (error) => {
      // Even if logout fails on server, clear local state
      console.error('Logout failed:', error)
      clearAuth()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  // Logout all sessions mutation
  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      return apiService.post('/auth/logout-all')
    },
    onSuccess: () => {
      clearAuth()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
    onError: (error) => {
      console.error('Logout all failed:', error)
      clearAuth()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  // Password reset request mutation
  const requestPasswordResetMutation = useMutation({
    mutationFn: async (data: PasswordResetRequest) => {
      return apiService.post('/auth/password-reset/request', data)
    },
  })

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: PasswordReset) => {
      return apiService.post('/auth/password-reset/confirm', data)
    },
    onSuccess: () => {
      navigate('/login', { replace: true })
    },
  })

  // Get user sessions query
  const {
    data: sessions,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async (): Promise<SessionData[]> => {
      return apiService.get('/auth/sessions')
    },
    enabled: isAuthenticated,
  })

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiService.delete(`/auth/sessions/${sessionId}`)
    },
    onSuccess: () => {
      refetchSessions()
    },
  })

  // Token refresh mutation
  const refreshTokenMutation = useMutation({
    mutationFn: async (refreshToken: string): Promise<AuthResponse> => {
      return apiService.post(endpoints.auth.refresh, { refreshToken })
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
    },
    onError: () => {
      // If refresh fails, clear auth and redirect to login
      clearAuth()
      navigate('/login', { replace: true })
    },
  })

  return {
    // State
    isAuthenticated,
    user,
    sessions,
    sessionsLoading,

    // Mutations
    login: loginMutation.mutate,
    loginLoading: loginMutation.isPending,
    loginError: (loginMutation.error as Error)?.message,

    register: registerMutation.mutate,
    registerLoading: registerMutation.isPending,
    registerError: (registerMutation.error as Error)?.message,

    logout: logoutMutation.mutate,
    logoutLoading: logoutMutation.isPending,

    logoutAll: logoutAllMutation.mutate,
    logoutAllLoading: logoutAllMutation.isPending,

    requestPasswordReset: requestPasswordResetMutation.mutate,
    requestPasswordResetLoading: requestPasswordResetMutation.isPending,
    requestPasswordResetError: (requestPasswordResetMutation.error as Error)?.message,
    requestPasswordResetSuccess: requestPasswordResetMutation.isSuccess,

    resetPassword: resetPasswordMutation.mutate,
    resetPasswordLoading: resetPasswordMutation.isPending,
    resetPasswordError: (resetPasswordMutation.error as Error)?.message,

    revokeSession: revokeSessionMutation.mutate,
    revokeSessionLoading: revokeSessionMutation.isPending,

    refreshToken: refreshTokenMutation.mutate,
    refreshTokenLoading: refreshTokenMutation.isPending,

    // Utilities
    refetchSessions,
  }
}