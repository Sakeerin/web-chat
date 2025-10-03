import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as argon2 from 'argon2'
import * as crypto from 'crypto'
import { PrismaService } from '../database/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import {
  AuthResult,
  TokenPair,
  JwtPayload,
  SessionInfo,
  PasswordResetToken,
} from './interfaces/auth.interface'

@Injectable()
export class AuthService {
  private readonly refreshTokenExpiry: number
  private readonly passwordResetExpiry: number

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')
    this.refreshTokenExpiry = parseInt(
      refreshExpiresIn.replace('d', ''),
    ) * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    
    this.passwordResetExpiry = 60 * 60 * 1000 // 1 hour in milliseconds
  }

  async register(
    registerDto: RegisterDto,
    deviceInfo?: {
      deviceId: string
      deviceName?: string
      deviceType?: string
      ipAddress?: string
      userAgent?: string
    },
  ): Promise<AuthResult> {
    const { email, password, username, name } = registerDto

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already registered')
      }
      if (existingUser.username === username) {
        throw new ConflictException('Username already taken')
      }
    }

    // Generate salt and hash password
    const salt = crypto.randomBytes(32).toString('hex')
    const passwordHash = await argon2.hash(password + salt, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    })

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name,
        passwordHash,
        salt,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        isVerified: true,
      },
    })

    // Create session and generate tokens
    const tokens = await this.createSession(user.id, deviceInfo)

    return {
      user,
      tokens,
    }
  }

  async login(
    loginDto: LoginDto,
    deviceInfo?: {
      deviceId: string
      deviceName?: string
      deviceType?: string
      ipAddress?: string
      userAgent?: string
    },
  ): Promise<AuthResult> {
    const user = await this.validateUser(loginDto.email, loginDto.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Create session and generate tokens
    const tokens = await this.createSession(user.id, deviceInfo)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
        isVerified: user.isVerified,
      },
      tokens,
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        isVerified: true,
        passwordHash: true,
        salt: true,
        isActive: true,
        isSuspended: true,
      },
    })

    if (!user || !user.isActive || user.isSuspended) {
      return null
    }

    // Verify password
    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      password + user.salt,
    )

    if (!isPasswordValid) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, salt, ...result } = user
    return result
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Find session by refresh token
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            isActive: true,
            isSuspended: true,
          },
        },
      },
    })

    if (
      !session ||
      !session.isActive ||
      session.expiresAt < new Date() ||
      !session.user.isActive ||
      session.user.isSuspended
    ) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    // Generate new tokens
    const newRefreshToken = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry)

    // Update session with new refresh token
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt,
        lastUsedAt: new Date(),
      },
    })

    // Generate new access token
    const payload: JwtPayload = {
      sub: session.user.id,
      email: session.user.email,
      username: session.user.username,
      sessionId: session.id,
    }

    const accessToken = this.jwtService.sign(payload)
    const expiresIn = parseInt(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '10m').replace('m', ''),
    ) * 60 // Convert minutes to seconds

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    }
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    })
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isActive: false },
    })
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceType: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        isActive: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    })

    return sessions
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        isActive: true,
      },
    })

    if (!session) {
      throw new NotFoundException('Session not found')
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    })
  }

  async requestPasswordReset(email: string): Promise<PasswordResetToken> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true, isSuspended: true },
    })

    if (!user || !user.isActive || user.isSuspended) {
      // Don't reveal if user exists for security
      throw new NotFoundException('If this email is registered, you will receive a reset link')
    }

    // Invalidate any existing reset tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    })

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + this.passwordResetExpiry)

    // Store reset token in database
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })
    
    return {
      token,
      expiresAt,
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find valid reset token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            isSuspended: true,
          },
        },
      },
    })

    if (
      !resetToken ||
      resetToken.isUsed ||
      resetToken.expiresAt < new Date() ||
      !resetToken.user.isActive ||
      resetToken.user.isSuspended
    ) {
      throw new BadRequestException('Invalid or expired reset token')
    }

    // Generate new salt and hash password
    const salt = crypto.randomBytes(32).toString('hex')
    const passwordHash = await argon2.hash(newPassword + salt, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    })

    // Update user password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          salt,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { isUsed: true },
      }),
      // Invalidate all user sessions to force re-login
      this.prisma.userSession.updateMany({
        where: { userId: resetToken.userId },
        data: { isActive: false },
      }),
    ])
  }

  async validateSession(sessionId: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
        user: {
          select: {
            isActive: true,
            isSuspended: true,
          },
        },
      },
    })

    if (
      !session ||
      !session.isActive ||
      session.expiresAt < new Date() ||
      !session.user.isActive ||
      session.user.isSuspended
    ) {
      return null
    }

    return session
  }

  async updateSessionLastUsed(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    })
  }

  private async createSession(
    userId: string,
    deviceInfo?: {
      deviceId: string
      deviceName?: string
      deviceType?: string
      ipAddress?: string
      userAgent?: string
    },
  ): Promise<TokenPair> {
    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry)

    // Create session
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        deviceId: deviceInfo?.deviceId || crypto.randomUUID(),
        deviceName: deviceInfo?.deviceName,
        deviceType: deviceInfo?.deviceType || 'web',
        ipAddress: deviceInfo?.ipAddress,
        userAgent: deviceInfo?.userAgent,
        refreshToken,
        expiresAt,
      },
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
      },
    })

    // Generate access token
    const payload: JwtPayload = {
      sub: userId,
      email: session.user.email,
      username: session.user.username,
      sessionId: session.id,
    }

    const accessToken = this.jwtService.sign(payload)
    const expiresIn = parseInt(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '10m').replace('m', ''),
    ) * 60 // Convert minutes to seconds

    return {
      accessToken,
      refreshToken,
      expiresIn,
    }
  }
}