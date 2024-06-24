import UnAuthorizedException from '#exceptions/un_authorized_exception';
import lucia from '#services/lucia_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class GetUserSessionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Middleware logic goes here (before the next call)
     */
    const sessionId = lucia.readSessionCookie(ctx.request.headers().cookie ?? "");
    if (!sessionId) {
      console.log('null')
      ctx.request.user = null;
      ctx.request.session = null;
      return await next()
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

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      throw new UnAuthorizedException('User is banned');
    }

    if (user.deletedAt) {
      throw new UnAuthorizedException('User account is deleted');
    }
    /**
     * Call next method in the pipeline and return its output
     */
    const output = await next()
    return output
  }
}
