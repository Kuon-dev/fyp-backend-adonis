/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { prisma } from '#services/prisma_service'

const AuthController = () => import('#controllers/auth_controller')

router.get('/', async () => {
  const users = await prisma.user.findMany()
  return {
    hello: 'world',
    users
  }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('/login', [AuthController, 'login'])
        router.post('/register', [AuthController, 'register'])
        router.post('/logout', [AuthController, 'logout'])
        router.post('/forgot-password', [AuthController, 'createPasswordResetToken'])
        router.post('/reset-password', [AuthController, 'resetPassword'])
        router.post('/verify-email', [AuthController, 'verifyEmail'])
      })
      .prefix('v1')
  })
  .prefix('api')

//
