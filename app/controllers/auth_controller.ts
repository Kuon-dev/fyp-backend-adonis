
import type { HttpContext } from '@adonisjs/core/http'
import AuthService from '#services/auth_service';
import { AuthValidator, ZodLoginAuthStrategy, PrismaEmailExistsAuthStrategy, ZodRegistrationAuthStrategy, PrismaEmailUniqueAuthStrategy } from "#validators/auth";
import { inject } from '@adonisjs/core';

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
  constructor(protected authService: AuthService) {}

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
      const sessionCookie = await this.authService.handleLogin(email, password);
      if (sessionCookie instanceof Response) {
        throw new Error('Invalid credentials');
      }
      return response.cookie('session', sessionCookie).status(200).json({ message: 'Login successful' });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
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
      return response.abort({ message: e.message }, 400);
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
   * Handle email verification.
   * 
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam sessionId - The session ID of the user.
   * @bodyParam code - The verification code.
   */
  async verifyEmail({ request, response }: HttpContext) {
    const { sessionId, code } = request.only(['sessionId', 'code']);
    try {
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
}

