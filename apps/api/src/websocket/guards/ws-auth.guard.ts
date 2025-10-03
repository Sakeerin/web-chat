import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { AuthenticatedSocket } from '../interfaces/websocket.interface'

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name)

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient()
      const data = context.switchToWs().getData()

      // For auth event, we handle authentication in the handler itself
      if (context.getHandler().name === 'handleAuth') {
        return true
      }

      // Check if socket is already authenticated
      const authenticatedClient = client as AuthenticatedSocket
      if (!authenticatedClient.userId) {
        throw new WsException('Authentication required')
      }

      return true
    } catch (error) {
      this.logger.error(`WebSocket authentication failed: ${error.message}`)
      throw new WsException('Authentication failed')
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    const token = client.handshake.auth?.token || 
                 client.handshake.headers?.authorization?.replace('Bearer ', '')
    return token || null
  }
}