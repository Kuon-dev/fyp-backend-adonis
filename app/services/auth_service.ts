
import { createDate, TimeSpan, isWithinExpirationDate } from "oslo";
import { verify } from "@node-rs/argon2";
import { hash } from "@node-rs/argon2";
import { Cookie, User, generateIdFromEntropySize } from "lucia";
import { encodeHex } from "oslo/encoding";
import { sha256 } from "oslo/crypto";
import UserVerificationService from "#services/user_verification_service";
import lucia from "#services/lucia_service";
import { prisma } from "#services/prisma_service";
// import { User } from "lucia";
// import { AuthValidator, ZodLoginAuthStrategy, PrismaEmailExistsAuthStrategy, ZodRegistrationAuthStrategy, PrismaEmailUniqueAuthStrategy } from "#validators/auth";
import { inject } from "@adonisjs/core";
import mailConfig from "#config/mail";
import { Exception } from "@adonisjs/core/exceptions";
import logger from "@adonisjs/core/services/logger";
import UnAuthorizedException from "#exceptions/un_authorized_exception";

@inject()
export default class AuthService {
  constructor(private userVerificationService: UserVerificationService) {}

  /**
   * Handles logging in a user with the given email and password.
   *
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<string>} - A session cookie if successful.
   */
  public async handleLogin(email: string, password: string): Promise<Response | Cookie> {

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // return new Response("Invalid email or password", { status: 400 });
      throw new Exception("Invalid email or password");
    }

    const validPassword = await verify(user.passwordHash, password, {
      memoryCost: 19456,
      timeCost: 3,
      parallelism: 1,
      outputLen: 64,
    });

    if (!validPassword) {
      throw new Exception("Invalid credentials", { status: 400 });
    }

    const session = await lucia.createSession(user.id.toString(), {});
    const sessionCookie = lucia.createSessionCookie(session.id.toString());
    return sessionCookie;
  }

  /**
   * Handles registering a new user with the given email, password, and full name.
   *
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @param {string} fullname - The user's full name.
   * @returns {Promise<string>} - A session cookie if successful.
   */
  public async handleRegistration(email: string, password: string, fullname: string): Promise<Response | string> {
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 3,
      parallelism: 1,
      outputLen: 64,
    });

    const id = generateIdFromEntropySize(32);

    try {
      await prisma.user.create({
        data: { id, email, passwordHash, role: "USER" },
      });

      await prisma.profile.create({
        data: { userId: id, name: fullname },
      });
      const session = await lucia.createSession(id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      const token = sessionCookie.serialize();

      const code = await this.userVerificationService.generateEmailVerificationCode(id, email);
      await this.userVerificationService.sendVerificationCode(email, code, token);
      return token

    } catch (e) {
      console.error("Failed to register user: ", e);
      throw new Exception("Failed to register user");
    }
  }

  /**
   * Handles logging out a user by invalidating their session.
   *
   * @param {string} sessionId - The session ID to invalidate.
   * @returns {Promise<void>}
   */
  public async handleLogout(sessionId: string): Promise<void> {
    return await lucia.invalidateSession(sessionId);
  }

  /**
   * Handles verifying a user's email with a verification code.
   *
   * @param {string} sessionId - The session ID of the user.
   * @param {string} code - The verification code.
   * @returns {Promise<string>} - A session cookie if successful.
   */
  public async handleVerifyEmail(sessionId: string, code: string): Promise<string | Response> {
    const { user } = await lucia.validateSession(sessionId);

    if (!user) {
      throw new UnAuthorizedException("Invalid User", { status: 401 });
    }

    const validCode = await this.userVerificationService.verifyVerificationCode(user, code);

    if (!validCode) {
      return new Response("Invalid code", { status: 400 });
    }

    await lucia.invalidateUserSessions(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    return sessionCookie.serialize();
  }

  /**
   * Handles creating a password reset token for a user.
   *
   * @param {string} userId - The user's ID.
   * @returns {Promise<string>} - The password reset token.
   */
  public async handleCreatePasswordResetToken(userId: string): Promise<string | Response> {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });

    const tokenId = generateIdFromEntropySize(25);
    const tokenHash = encodeHex(await sha256(new TextEncoder().encode(tokenId)));

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt: createDate(new TimeSpan(2, "h")),
      },
    });

    return tokenId;
  }

  /**
   * Handles verifying if a user exists and their email is verified.
   *
   * @param {string} email - The user's email.
   * @returns {Promise<boolean>} - True if user exists and email is verified, false otherwise.
   */
  public async handleVerifyUserExistAndEmailVerified(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { email } });
    return !!user && user.emailVerified;
  }

  /**
   * Handles password reset for a user with the given token and new password.
   *
   * @param {string} token - The password reset token.
   * @param {string} password - The new password.
   * @returns {Promise<string>} - A session cookie if successful.
   */
  public async handlePasswordReset(token: string, password: string): Promise<Cookie | Response> {
    const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));

    const tokenData = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!tokenData || !isWithinExpirationDate(tokenData.expiresAt)) {
      await prisma.passwordResetToken.delete({ where: { tokenHash } });
      return new Response("Invalid or expired token", { status: 400 });
    }

    await lucia.invalidateUserSessions(tokenData.userId.toString());

    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 3,
      parallelism: 1,
      outputLen: 64,
    });

    await prisma.user.update({
      where: { id: tokenData.userId },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.delete({ where: { tokenHash } });

    const session = await lucia.createSession(tokenData.userId.toString(), {});
    return lucia.createSessionCookie(session.id);
  }

  public async sendVerifyEmailCode(user: User) {
    logger.info('sending email verification code to ' + user.email);
    if (user.emailVerified) {
      throw new Exception("Email already verified", { status: 400 });
    }
    const session = await lucia.createSession(user.id.toString(), {});
    const token = lucia.createSessionCookie(session.id).serialize();

    const code = await this.userVerificationService.generateEmailVerificationCode(user.id, user.email);
    await this.userVerificationService.sendVerificationCode(user.email, code, token);
  }
}
