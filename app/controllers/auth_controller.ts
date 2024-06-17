
import type { HttpContext } from '@adonisjs/core/http'
import AuthService from '#services/auth_service';
import { AuthValidator, ZodLoginAuthStrategy, PrismaEmailExistsAuthStrategy, ZodRegistrationAuthStrategy, PrismaEmailUniqueAuthStrategy } from "#validators/auth";
import { inject } from '@adonisjs/core';
import lucia from '#services/lucia_service';
import { Exception } from '@adonisjs/core/exceptions';
import type { Cookie } from 'lucia';
import { UserService } from '#services/user_service';
import { prisma } from '#services/prisma_service';
import InvalidSessionIdException from '#exceptions/invalid_session_id_exception';

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
  constructor(protected authService: AuthService, protected userService: UserService) {}

  /**
   * Handle user login.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam email - The user's email address.
   * @bodyParam password - The user's password.
   */
  async login({ request, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password']);

    const loginValidator = new AuthValidator();
    loginValidator.addStrategy(new ZodLoginAuthStrategy());
    loginValidator.addStrategy(new PrismaEmailExistsAuthStrategy());

    try {
      await loginValidator.validate({ email, password });
    } catch (e: Error | any) {
      return response.abort({ message: e.message }, 400);
    }

    try {
      const sessionCookie: Cookie | Response  = await this.authService.handleLogin(email, password);
      if (sessionCookie instanceof Response) {
        throw new Error('Invalid credentials');
      }

      // const c = sessionCookie.serialize();
      const c = sessionCookie.serialize();
      console.log(c)
      const sid = lucia.readSessionCookie(c);
      const { user } = await lucia.validateSession(sid ?? "");
      if (!user) throw new InvalidSessionIdException();

      return response.header('Set-Cookie', c).status(200).json({ message: 'Login successful' });
    } catch (error) {
      return response.abort({ message: error.message }, error.status ?? 400);
    }
  }

  /**
   * Handle user registration.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam email - The user's email address.
   * @bodyParam password - The user's password.
   * @bodyParam fullname - The user's full name.
   */
  async register({ request, response }: HttpContext) {
    const { email, password, fullname } = request.only(['email', 'password', 'fullname']);
    const registrationValidator = new AuthValidator();
    registrationValidator.addStrategy(new ZodRegistrationAuthStrategy());
    registrationValidator.addStrategy(new PrismaEmailUniqueAuthStrategy());

    try {
      await registrationValidator.validate({ email, password, fullname });
    } catch (e: Error | any) {
      console.log(e)
      if (Array.isArray(e)) {
        return response.abort({ message: e}, 400);
      }
      else return response.abort({ message: e.message }, 400);
    }

    try {
      const sessionCookie = await this.authService.handleRegistration(email, password, fullname);
      if (sessionCookie instanceof Response) {
        throw new Error('Registration failed');
      }
      return response.cookie('session', sessionCookie).status(201).json({ message: 'Registration successful' });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle user logout.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @cookieParam session - The session ID cookie.
   */
  async logout({ request, response }: HttpContext) {
    const sessionId = request.cookie('session');
    try {
      await this.authService.handleLogout(sessionId);
      return response.clearCookie('session').status(200).json({ message: 'Logout successful' });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle email verification, this refers to verifying a user's email address.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam sessionId - The session ID of the user.
   * @bodyParam code - The verification code.
   */
  async verifyEmail({ request, response }: HttpContext) {
    const { code } = request.only([ 'code']);
    try {
      const sessionId = lucia.readSessionCookie(request.headers().cookie ?? "");
      if (!sessionId) {
        throw new InvalidSessionIdException();
      }
      const sessionCookie = await this.authService.handleVerifyEmail(sessionId, code);
      if (sessionCookie instanceof Response) {
        throw new Error('Email verification failed');
      }
      return response.cookie('session', sessionCookie).status(200).json({ message: 'Email verification successful' });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle password reset token creation.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam userId - The user's ID.
   */
  async createPasswordResetToken({ request, response }: HttpContext) {
    const { userId } = request.only(['userId']);
    try {
      const token = await this.authService.handleCreatePasswordResetToken(userId);
      if (token instanceof Response) {
        throw new Error('Password reset token creation failed');
      }
      return response.status(200).json({ token });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle password reset.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam token - The password reset token.
   * @bodyParam password - The new password.
   */
  async resetPassword({ request, response }: HttpContext) {
    const { token, password } = request.only(['token', 'password']);
    try {
      const sessionCookie = await this.authService.handlePasswordReset(token, password);
      if (sessionCookie instanceof Response) {
        throw new Error('Password reset failed');
      }
      return response.cookie('session', sessionCookie).status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Verify if user exists and their email is verified.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam email - The user's email address.
   */
  async verifyUserExistAndEmailVerified({ request, response }: HttpContext) {
    const { email } = request.only(['email']);
    try {
      const exists = await this.authService.handleVerifyUserExistAndEmailVerified(email);
      return response.status(200).json({ exists });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  async sendVerifyEmailCodeFromUser({ request, response }: HttpContext) {
    if (request.user === null) throw new UnauthorizedException('User not found in request object');
    console.log(request.user)
    try {
      await this.authService.sendVerifyEmailCode(request.user);
      return response.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
      return response.abort({ message: error.message }, error.status ?? 400);
    }
  }

  /**
   * Get the user profile.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   */

  async me({ request, response }: HttpContext) {
    try {
      if (request.user === null) throw new Exception('User not found in request object', { status: 401, code: 'E_UNAUTHORIZED' });
      const profile = await this.userService.getUserProfileById(request.user?.id);
      // if the user profile is somehow not being created
      if (!profile) await prisma.profile.create({ data: { userId: request.user?.id, name: 'new user' } });
      return response.status(200).json({
        user: request.user,
        profile: profile
      });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }
}

