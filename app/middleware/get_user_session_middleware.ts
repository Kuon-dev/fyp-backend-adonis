import UnAuthorizedException from '#exceptions/un_authorized_exception'
import lucia from '#services/lucia_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class GetUserSessionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Middleware logic goes here (before the next call)
     */
    const sessionId = lucia.readSessionCookie(ctx.request.headers().cookie ?? '')
    if (!sessionId) {
      //console.log('no session')
      ctx.request.user = null
      ctx.request.session = null
      const output = await next()
      return output
    } else {
      const { session, user } = await lucia.validateSession(sessionId)
      if (session && session.fresh) {
        ctx.response.header('Set-Cookie', lucia.createSessionCookie(session.id).serialize())
      }

      if (!session) {
        ctx.response.header('Set-Cookie', lucia.createBlankSessionCookie().serialize())
      }

      if (session && session.fresh) {
        ctx.response.header('Set-Cookie', lucia.createSessionCookie(session.id).serialize())
      }

      // if there is no user found but a role prop exist
      //if (!user) {
      //  console.log('no user')
      //  throw new UnAuthorizedException()
      //}

      ctx.request.user = user
      ctx.request.session = session

      /**
       * Call next method in the pipeline and return its output
       */
      await next()
    }
  }
}
