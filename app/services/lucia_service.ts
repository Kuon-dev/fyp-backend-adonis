import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { Role } from "@prisma/client";
import { prisma } from "./prisma_service.js";

import {
  HttpContext,
  // Response,
} from '@adonisjs/core/http'
import logger from "@adonisjs/core/services/logger";

// import type { Session, User } from 'lucia'

const client = prisma;
const adapter = new PrismaAdapter(client.session, client.user);

const env = process.env.NODE_ENV;

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: env === "PRODUCTION", // set `Secure` flag in HTTPS
    },
  },
  getUserAttributes: (attributes) => {
    // get profile attributes from the user
    return {
      email: attributes.email,
      emailVerified: attributes.emailVerified,
      // avatar: attributes.avatar,
      role: attributes.role,
      bannedUntil: attributes.bannedUntil,
    };
  },
});

export const validateRequestFromMiddleware = async (ctx: HttpContext) => {
  const sessionId = lucia.readSessionCookie(ctx.request.headers().cookie ?? "");
  if (!sessionId)
    return {
      user: null,
      session: null,
    };

  const result = await lucia.validateSession(sessionId);
  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id);
      ctx.request.headers().SetCookie = sessionCookie.serialize()
    }
  } catch (error) {
    logger.error(error);
  }
  return result;
};

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      avatar: string;
      emailVerified: boolean;
      role: Role;
      bannedUntil?: Date | null;
    };
  }
}

export default lucia;
