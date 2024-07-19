import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
//import lucia from '#services/lucia_service';
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import { Role } from '@prisma/client'
import UserNotVerifiedException from '#exceptions/user_not_verified_exception'

export default class AuthGuardMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { role: Role }) {
    const user = ctx.request.user
    if (!user) {
      throw new UnAuthorizedException('User not authenticated')
    }

    const userRole = user.role
    const requiredRole = options.role
    console.log(userRole, requiredRole)

    if (!this.hasAccess(userRole, requiredRole)) {
      throw new UnAuthorizedException('Insufficient permissions')
    }

    if (!user.emailVerified) {
      throw new UserNotVerifiedException()
    }

    if (user?.bannedUntil && user?.bannedUntil > new Date()) {
      throw new UnAuthorizedException('User is banned')
    }

    if (user?.deletedAt) {
      throw new UnAuthorizedException('User account is deleted')
    }

    // If the user has the required role or higher, allow access
    await next()
  }

  private hasAccess(userRole: Role, requiredRole: Role): boolean {
    const roleHierarchy = {
      [Role.USER]: 1,
      [Role.SELLER]: 2,
      [Role.MODERATOR]: 3,
      [Role.ADMIN]: 4,
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }
}
