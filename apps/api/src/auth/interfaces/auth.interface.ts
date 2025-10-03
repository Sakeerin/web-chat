export interface JwtPayload {
  sub: string // user ID
  email: string
  username: string
  sessionId: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthResult {
  user: {
    id: string
    email: string
    username: string
    name: string
    avatarUrl?: string | null
    isVerified: boolean
  }
  tokens: TokenPair
}

export interface SessionInfo {
  id: string
  deviceId: string
  deviceName?: string | null
  deviceType?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  lastUsedAt: Date
  createdAt: Date
  isActive: boolean
}

export interface PasswordResetToken {
  token: string
  expiresAt: Date
}