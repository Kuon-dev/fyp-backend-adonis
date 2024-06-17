import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import lucia from '#services/lucia_service';
// import { Exception } from '@adonisjs/core/exceptions';
import UnAuthorizedException from '#exceptions/un_authorized_exception';
import { Role } from '@prisma/client';

export default class AuthGuardMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { role: Role }) {
    const sessionId = lucia.readSessionCookie(ctx.request.headers().cookie ?? "");
    if (!sessionId) {
      ctx.request.user = null;
      ctx.request.session = null;
      throw new UnAuthorizedException();
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (session && session.fresh) {
      ctx.response.header(
        "Set-Cookie",
        lucia.createSessionCookie(session.id).serialize()
      );
    }

    if (!session) {
      ctx.response.header(
        "Set-Cookie",
        lucia.createBlankSessionCookie().serialize()
      );
    }
    // if there is no user found but a role prop exist

    if (!user) {
      throw new UnAuthorizedException();
    }

    // Check if the user has the required role
    if (options.role && user.role !== options.role) {
      throw new UnAuthorizedException('User does not have the required role');
    }

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      throw new UnAuthorizedException('User is banned');
    }

    ctx.request.user = user;
    ctx.request.session = session;


    const output = await next();
    return output;
  }
}

