import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import lucia from '#services/lucia_service';
import { Exception } from '@adonisjs/core/exceptions';

export default class AuthGuardMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Middleware logic goes here (before the next call)
     */
    // console.log(ctx)

    const sessionId = lucia.readSessionCookie(ctx.request.headers().cookie ?? "");
    if (!sessionId) {
      ctx.request.user = null;
      ctx.request.session = null;
      // return sendErrorResponse(reply, 401, "Unauthorized");
      throw new Exception("Unauthorized", { status: 401 });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (session && session.fresh) {
      // reply.header(
      //   "Set-Cookie",
      //   lucia.createSessionCookie(session.id).serialize(),
      // );
      ctx.response.header(
        "Set-Cookie",
        lucia.createSessionCookie(session.id).serialize()
      );
    }

    if (!session) {
      // reply.header("Set-Cookie", lucia.createBlankSessionCookie().serialize());
      ctx.response.header(
        "Set-Cookie",
        lucia.createBlankSessionCookie().serialize()
      );
    }
    ctx.request.user = user;
    ctx.request.session = session;

    /**
     * Call next method in the pipeline and return its output
     */
    const output = await next()
    return output
  }
}
