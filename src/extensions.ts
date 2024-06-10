import { Request } from '@adonisjs/core/http'
// import { User } from '@prisma/client'
import type { User, Session } from "lucia";

Request.macro('user', function (this: Request) {
  return this.user
})

// Request.getter('user', function (this: Request) {
//   return this.user
// })

Request.macro('session', function (this: Request) {
  return this.session
})



declare module '@adonisjs/core/http' {
  interface Request {
    user: User | null
    session: Session | null
  }
}
