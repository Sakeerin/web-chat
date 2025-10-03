import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common'
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger'
import * as crypto from 'crypto'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/reset-password.dto'
import { LogoutDto } from './dto/logout.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { Public } from '../common/decorators/public.decorator'
import { Throttle } from '../common/decorators/throttle.decorator'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ name: 'auth' })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const deviceInfo = {
      deviceId: crypto.randomUUID(),
      deviceType: 'web',
      ipAddress,
      userAgent,
    }

    return this.authService.register(registerDto, deviceInfo)
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ name: 'auth' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const deviceInfo = {
      deviceId: crypto.randomUUID(),
      deviceType: 'web',
      ipAddress,
      userAgent,
    }

    return this.authService.login(loginDto, deviceInfo)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken)
  }

  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout from current or specific session' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req: any, @Body() logoutDto: LogoutDto) {
    const sessionId = logoutDto.sessionId || req.user.sessionId
    await this.authService.logout(sessionId)
  }

  @ApiBearerAuth('JWT-auth')
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout from all sessions' })
  @ApiResponse({ status: 204, description: 'Logged out from all sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@Request() req: any) {
    await this.authService.logoutAll(req.user.userId)
  }

  @ApiBearerAuth('JWT-auth')
  @Get('sessions')
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessions(@Request() req: any) {
    return this.authService.getUserSessions(req.user.userId)
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 204, description: 'Session revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to revoke' })
  async revokeSession(@Request() req: any, @Param('sessionId') sessionId: string) {
    await this.authService.revokeSession(req.user.userId, sessionId)
  }

  @Public()
  @Throttle({ name: 'auth' })
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent if account exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiBody({ type: RequestPasswordResetDto })
  async requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(requestDto.email)
    
    // In a real implementation, you would send an email here
    // For now, return success message without exposing the token
    return {
      message: 'If this email is registered, you will receive a reset link',
    }
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetDto.token, resetDto.newPassword)
    return {
      message: 'Password reset successfully',
    }
  }

  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: any) {
    return {
      userId: req.user.userId,
      email: req.user.email,
      username: req.user.username,
      sessionId: req.user.sessionId,
    }
  }
}