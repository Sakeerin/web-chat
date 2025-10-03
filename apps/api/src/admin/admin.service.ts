import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { AuditService } from './audit.service'
import {
  AdminUser,
  UserManagementResult,
  UserRole,
  AdminAction,
} from './interfaces/admin.interface'
import {
  SuspendUserDto,
  BanUserDto,
  UpdateUserRoleDto,
} from './dto/admin.dto'

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: UserRole,
    status?: 'active' | 'suspended' | 'banned',
  ): Promise<{ users: AdminUser[]; total: number; pages: number }> {
    const skip = (page - 1) * limit
    
    const where: any = {}
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (role) {
      where.role = role
    }
    
    if (status === 'active') {
      where.isActive = true
      where.isSuspended = false
    } else if (status === 'suspended') {
      where.isSuspended = true
    } else if (status === 'banned') {
      where.isActive = false
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          isSuspended: true,
          suspendedUntil: true,
          createdAt: true,
          lastSeenAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      users: users as AdminUser[],
      total,
      pages: Math.ceil(total / limit),
    }
  }

  async getUserById(userId: string): Promise<AdminUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        suspendedUntil: true,
        createdAt: true,
        lastSeenAt: true,
        _count: {
          select: {
            sentMessages: true,
            conversationMembers: true,
            reportsMade: true,
            reportsReceived: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    return user as AdminUser
  }

  async suspendUser(
    suspendUserDto: SuspendUserDto,
    adminId: string,
  ): Promise<UserManagementResult> {
    const { userId, reason, duration } = suspendUserDto

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Cannot suspend admin users')
    }

    const suspendedUntil = duration
      ? new Date(Date.now() + duration * 60 * 60 * 1000)
      : undefined

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspendedUntil,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        suspendedUntil: true,
        createdAt: true,
        lastSeenAt: true,
      },
    })

    // Log the action
    await this.auditService.logAction(
      adminId,
      AdminAction.USER_SUSPENDED,
      'user',
      userId,
      { reason, duration, suspendedUntil },
    )

    return {
      success: true,
      message: `User ${user.username} has been suspended`,
      user: updatedUser as AdminUser,
    }
  }

  async unsuspendUser(
    userId: string,
    adminId: string,
  ): Promise<UserManagementResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: false,
        suspendedUntil: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        suspendedUntil: true,
        createdAt: true,
        lastSeenAt: true,
      },
    })

    // Log the action
    await this.auditService.logAction(
      adminId,
      AdminAction.USER_UNSUSPENDED,
      'user',
      userId,
      {},
    )

    return {
      success: true,
      message: `User ${user.username} has been unsuspended`,
      user: updatedUser as AdminUser,
    }
  }

  async banUser(
    banUserDto: BanUserDto,
    adminId: string,
  ): Promise<UserManagementResult> {
    const { userId, reason, permanent } = banUserDto

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Cannot ban admin users')
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        isSuspended: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        suspendedUntil: true,
        createdAt: true,
        lastSeenAt: true,
      },
    })

    // Log the action
    await this.auditService.logAction(
      adminId,
      AdminAction.USER_BANNED,
      'user',
      userId,
      { reason, permanent },
    )

    return {
      success: true,
      message: `User ${user.username} has been banned`,
      user: updatedUser as AdminUser,
    }
  }

  async updateUserRole(
    updateUserRoleDto: UpdateUserRoleDto,
    adminId: string,
  ): Promise<UserManagementResult> {
    const { userId, role } = updateUserRoleDto

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        suspendedUntil: true,
        createdAt: true,
        lastSeenAt: true,
      },
    })

    // Log the action
    await this.auditService.logAction(
      adminId,
      AdminAction.USER_ROLE_UPDATED,
      'user',
      userId,
      { oldRole: user.role, newRole: role },
    )

    return {
      success: true,
      message: `User ${user.username} role updated to ${role}`,
      user: updatedUser as AdminUser,
    }
  }
}