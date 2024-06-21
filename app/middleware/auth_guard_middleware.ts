import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import lucia from '#services/lucia_service';
// import { Exception } from '@adonisjs/core/exceptions';
import UnAuthorizedException from '#exceptions/un_authorized_exception';
import { Role } from '@prisma/client';

export default class AuthGuardMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { role: Role }) {
    const user = ctx.request.user;
    if (!user) {
      throw new UnAuthorizedException('User not authenticated');
    }
    // Check if the user has the required role
    if (options.role && user.role !== options.role) {
      // admin has all the privileges, if the provided role is user and the user is admin, then allow, otherwise throw an error
      if (options.role === Role.USER && user.role === Role.ADMIN) {
        return await next();
      }

      // if min role is moderator and user is admin, allow
      if (options.role === Role.MODERATOR && user.role === Role.ADMIN) {
        ctx.request.user = user;
        return await next();
      }

      // if min role is user and user is moderator, allow
      if (options.role === Role.USER && user.role === Role.MODERATOR) {
        return await next();
      }

      else
        throw new UnAuthorizedException('User does not have the required role');
    }

  }
}

