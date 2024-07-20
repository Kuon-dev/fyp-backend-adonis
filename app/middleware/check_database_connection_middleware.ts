import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { prisma } from '#services/prisma_service'

export default class CheckDatabaseConnection  {
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      await prisma.$connect()
      await next()
    }
    catch (e) {
      ctx.response.abort({
        message: "Unable to connect to database"
      })
    }
  }
}
