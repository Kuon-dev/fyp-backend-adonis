import { Request } from '@adonisjs/core/http'
// import { User } from '@prisma/client'
import type { User, Session } from "lucia";

declare module '@adonisjs/core/http' {
  interface Request {
    user: User | null
    //setUser(u: User | null): void
    session: Session | null
  }
}

//Request.macro('user', Request.user) 
//Request.macro('setUser', function (this: Request, user: User | null) {
//  this.user = user
//})

Request.macro('user', function (this: Request) {
  return this.user
})

Request.macro('session', function (this: Request) {
  return this.session
})


