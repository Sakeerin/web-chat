import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'
import { JwtPayload } from '../interfaces/auth.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload) {
    // Verify the session is still active
    const session = await this.authService.validateSession(payload.sessionId)
    if (!session) {
      throw new UnauthorizedException('Session expired or invalid')
    }

    // Update last used timestamp
    await this.authService.updateSessionLastUsed(payload.sessionId)

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      sessionId: payload.sessionId,
    }
  }
}