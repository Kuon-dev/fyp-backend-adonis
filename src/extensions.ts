import { Request } from '@adonisjs/core/http'
// import { User } from '@prisma/client'
import type { User, Session } from "lucia";

declare module '@adonisjs/core/http' {
  interface Request {
    user: User | null
    //setUser(u: User | null): void
    session: Session | null
    token: string
  }
}

//Request.macro('user', Request.user)
//Request.macro('setUser', function (this: Request, user: User | null) {
//  this.user = user
//})

Request.macro('user', null as User | null)

Request.macro('session', null as Session | null)


