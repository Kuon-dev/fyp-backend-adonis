import { validateRequestFromMiddleware } from '#services/lucia_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class GetUserSessionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Middleware logic goes here (before the next call)
     */
    await validateRequestFromMiddleware(ctx)
    /**
     * Call next method in the pipeline and return its output
     */
    const output = await next()
    return output
  }
}
