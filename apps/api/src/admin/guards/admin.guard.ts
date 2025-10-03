import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // Get user with role information
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isActive: true, isSuspended: true },
    })

    if (!userWithRole) {
      throw new ForbiddenException('User not found')
    }

    if (!userWithRole.isActive || userWithRole.isSuspended) {
      throw new ForbiddenException('User account is not active')
    }

    if (userWithRole.role !== 'ADMIN' && userWithRole.role !== 'MODERATOR') {
      throw new ForbiddenException('Insufficient permissions')
    }

    // Add role to request for use in controllers
    request.user.role = userWithRole.role

    return true
  }
}