import type { HttpContext } from '@adonisjs/core/http'
import AuthService from '#services/auth_service'
import {
  AuthValidator,
  ZodLoginAuthStrategy,
  PrismaEmailExistsAuthStrategy,
  ZodRegistrationAuthStrategy,
  PrismaEmailUniqueAuthStrategy,
  EmptyFieldAuthStrategy,
} from '#validators/auth'
import { inject } from '@adonisjs/core'
import lucia from '#services/lucia_service'
import { Exception } from '@adonisjs/core/exceptions'
import type { Cookie } from 'lucia'
import { UserService } from '#services/user_service'
import { prisma } from '#services/prisma_service'
import InvalidSessionIdException from '#exceptions/invalid_session_id_exception'
import UnAuthorizedException from '#exceptions/un_authorized_exception'

/**
 * Controller class for handling user authentication operations.
 */
@inject()
export default class AuthController {
  /**
   * Creates an instance of AuthController.
   *
   * @param authService - The authentication service.
   */
  constructor(
    protected authService: AuthService,
    protected userService: UserService
  ) {}

  /**
   * @login
   * @description Handle user login.
   * @requestBody { "email": "user@example.com", "password": "123123123"}
   * @responseBody 200 - { "message": "Login successful" }
   * @responseBody 400 - { "message": "Invalid credentials" }
   */
  async login({ request, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    const loginValidator = new AuthValidator()
    //loginValidator.addStrategy(new ZodLoginAuthStrategy())
    loginValidator.addStrategy(new PrismaEmailExistsAuthStrategy())
    loginValidator.addStrategy(new EmptyFieldAuthStrategy())

    try {
      await loginValidator.validate({ email, password })
    } catch (e: Error | any) {
      console.log(e)
      return response.abort({ message: e.message }, 400)
    }

    try {
      const sessionCookie: Cookie | Response = await this.authService.handleLogin(email, password)
      if (sessionCookie instanceof Response) {
        throw new Error('Invalid credentials')
      }

      const c = sessionCookie.serialize()
      const sid = lucia.readSessionCookie(c)
      const { user } = await lucia.validateSession(sid ?? '')
      if (!user) throw new InvalidSessionIdException()

      return response.header('Set-Cookie', c).status(200).json({ message: 'Login successful' })
    } catch (error) {
      return response.abort({ message: error.message }, error.status ?? 400)
    }
  }

  /**
   * @register
   * @description Handle user registration.
   * @bodyParam email - The user's email address.
   * @requestBody { "email": "user@example.com", "password": "123123123", "fullname": "John Doe"}
   * @bodyParam password - The user's password.
   * @bodyParam fullname - The user's full name.
   * @responseBody 201 - { "message": "Registration successful" }
   * @responseBody 400 - { "message": "Registration failed" }
   */
  async register({ request, response }: HttpContext) {
    const { email, password, fullname } = request.only(['email', 'password', 'fullname'])
    const registrationValidator = new AuthValidator()
    registrationValidator.addStrategy(new ZodRegistrationAuthStrategy())
    registrationValidator.addStrategy(new PrismaEmailUniqueAuthStrategy())

    try {
      await registrationValidator.validate({ email, password, fullname })
    } catch (e: Error | any) {
      if (Array.isArray(e)) {
        return response.abort({ message: e }, 400)
      } else {
        return response.abort({ message: e.message }, 400)
      }
    }

    try {
      const sessionCookie = await this.authService.handleRegistration(email, password, fullname)
      if (sessionCookie instanceof Response) {
        throw new Error('Registration failed')
      }
      return response
        .cookie('session', sessionCookie)
        .status(201)
        .json({ message: 'Registration successful' })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * @logout
   * @description Handle user logout.
   * @responseBody 200 - { "message": "Logout successful" }
   * @responseBody 400 - { "message": "Logout failed" }
   */
  async logout({ request, response }: HttpContext) {
    const sessionId = request.cookie('session')
    try {
      await this.authService.handleLogout(sessionId)
      return response.clearCookie('session').status(200).json({ message: 'Logout successful' })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * @verifyEmail
   * @description Handle email verification.
   * @requestBody { "code": "123456" }
   * @responseBody 200 - { "message": "Email verification successful" }
   * @responseBody 400 - { "message": "Email verification failed" }
   */
  async verifyEmail({ request, response }: HttpContext) {
    const { code } = request.only(['code'])
    try {
      const sessionId = lucia.readSessionCookie(request.headers().cookie ?? '')
      if (!sessionId) {
        throw new InvalidSessionIdException()
      }
      const sessionCookie = await this.authService.handleVerifyEmail(sessionId, code)
      if (sessionCookie instanceof Response) {
        throw new Error('Email verification failed')
      }
      return response
        .cookie('session', sessionCookie)
        .status(200)
        .json({ message: 'Email verification successful' })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * @createPasswordResetToken
   * @description Handle password reset token creation.
   * @requestBody { "userId": "123456" }
   * @responseBody 200 - { "token": "generated_token" }
   * @responseBody 400 - { "message": "Password reset token creation failed" }
   */
  async createPasswordResetToken({ request, response }: HttpContext) {
    const { userId } = request.only(['userId'])
    try {
      const token = await this.authService.handleCreatePasswordResetToken(userId)
      if (token instanceof Response) {
        throw new Error('Password reset token creation failed')
      }
      return response.status(200).json({ token })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * @resetPassword
   * @description Handle password reset.
   * @requestBody { "token": "generated_token", "password": "123456" }
   * @responseBody 200 - { "message": "Password reset successful" }
   * @responseBody 400 - { "message": "Password reset failed" }
   */
  async resetPassword({ request, response }: HttpContext) {
    const { token, password } = request.only(['token', 'password'])
    try {
      const sessionCookie = await this.authService.handlePasswordReset(token, password)
      if (sessionCookie instanceof Response) {
        throw new Error('Password reset failed')
      }
      return response
        .cookie('session', sessionCookie)
        .status(200)
        .json({ message: 'Password reset successful' })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * @verifyUserExistAndEmailVerified
   * @description Verify if user exists and their email is verified.
   * @bodyParam email - The user's email address.
   * @responseBody 200 - { "exists": true }
   * @responseBody 400 - { "message": "Verification failed" }
   */
  async verifyUserExistAndEmailVerified({ request, response }: HttpContext) {
    const { email } = request.only(['email'])
    try {
      const exists = await this.authService.handleVerifyUserExistAndEmailVerified(email)
      return response.status(200).json({ exists })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * @sendVerifyEmailCodeFromUser
   * @description Send verification email code to the user.
   * @responseBody 401 - { "message": "User not found in request object" }
   * @responseBody 400 - { "message": "Sending verification email failed" }
   */
  async sendVerifyEmailCodeFromUser({ request, response }: HttpContext) {
    if (request.user === null) throw new UnAuthorizedException('User not found in request object')
    try {
      await this.authService.sendVerifyEmailCode(request.user)
      return response.status(200).json({ message: 'Verification email sent' })
    } catch (error) {
      return response.abort({ message: error.message }, error.status ?? 400)
    }
  }

  /**
   * @me
   * @description Get the user profile.
   * @responseBody 200 - { "user": { "email": "wOwYg@example.com", "role": "USER" }, "profile": { "firstName": "John", "lastName": "Doe" } }
   * @responseBody 400 - { "message": "Profile retrieval failed" }
   */
  async me({ request, response }: HttpContext) {
    try {
      if (request.user === null) throw new Exception('No cookie session found', { status: 204 })
      const [user, profile, sellerProfile] = await Promise.all([
        prisma.user.findUnique({ where: { id: request.user.id } }),
        prisma.profile.findUnique({ where: { userId: request.user.id } }),
        prisma.sellerProfile.findUnique({ where: { userId: request.user.id } }),
      ])
      return response.status(200).json({ user, profile, sellerProfile })
    } catch (error) {
      return response.abort({ message: error.message }, error.status ?? 400)
    }
  }
}
