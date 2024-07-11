import { prisma } from '#services/prisma_service'
import { ZodError, z } from 'zod'

/**
 * Schema for validating user registration data.
 */
export const registrationSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(255, { message: 'Password must be at most 255 characters long' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
    .regex(/\d/, { message: 'Password must contain at least one number' }),
  fullname: z.string().min(1, { message: 'Full name is required' }),
})

/**
 * Schema for validating user login data.
 */
export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
})

/**
 * Schema for validating forgot password request data.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
})

/**
 * Schema for validating reset password data.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: 'Token is required' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .max(255, { message: 'Password must be at most 255 characters long' })
      .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
      .regex(/\d/, { message: 'Password must contain at least one number' }),
    confirmPassword: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

/**
 * Interface for authentication strategies.
 */
export interface AuthStrategy {
  /**
   * Validates the provided data.
   * @param data - The data to validate.
   */
  validate(data: {
    email?: string
    password?: string
    fullname?: string
    token?: string
    confirmPassword?: string
  }): Promise<void>
}

/**
 * Strategy for validating user registration data using Zod schema.
 */
export class ZodRegistrationAuthStrategy implements AuthStrategy {
  async validate(data: { email: string; password: string; fullname: string }): Promise<void> {
    try {
      registrationSchema.parse(data)
    } catch (error) {
      if (error instanceof ZodError) {
        throw error.errors.map((e) => ({
          code: e.code,
          path: e.path,
          message: e.message,
          fatalError: e.fatal,
        }))
      }
      throw error
    }
  }
}

/**
 * Strategy for validating user login data using Zod schema.
 */
export class ZodLoginAuthStrategy implements AuthStrategy {
  async validate(data: { email: string; password: string }): Promise<void> {
    try {
      loginSchema.parse(data)
    } catch (error) {
      if (error instanceof ZodError) {
        throw error.errors.map((e) => ({
          code: e.code,
          path: e.path,
          message: e.message,
          fatalError: e.fatal,
        }))
      }
      throw error
    }
  }
}

/**
 * Strategy for validating forgot password request data using Zod schema.
 */
export class ZodForgotPasswordAuthStrategy implements AuthStrategy {
  async validate(data: { email: string }): Promise<void> {
    try {
      forgotPasswordSchema.parse(data)
    } catch (error) {
      if (error instanceof ZodError) {
        throw error.errors.map((e) => ({
          code: e.code,
          path: e.path,
          message: e.message,
          fatalError: e.fatal,
        }))
      }
      throw error
    }
  }
}

/**
 * Strategy for validating reset password data using Zod schema.
 */
export class ZodResetPasswordAuthStrategy implements AuthStrategy {
  async validate(data: {
    token: string
    password: string
    confirmPassword: string
  }): Promise<void> {
    try {
      resetPasswordSchema.parse(data)
    } catch (error) {
      if (error instanceof ZodError) {
        throw error.errors.map((e) => ({
          code: e.code,
          path: e.path,
          message: e.message,
          fatalError: e.fatal,
        }))
      }
      throw error
    }
  }
}
/**
 * Strategy for ensuring unique email using Prisma.
 */
export class PrismaEmailUniqueAuthStrategy implements AuthStrategy {
  async validate(data: { email: string }): Promise<void> {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
    if (existingUser) {
      throw new Error('Email is already in use')
    }
  }
}

/**
 * Strategy for checking if an email exists using Prisma.
 */
export class PrismaEmailExistsAuthStrategy implements AuthStrategy {
  async validate(data: { email: string }): Promise<void> {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
    if (!existingUser) {
      throw new Error('Email does not exist')
    }
  }
}

export class EmptyFieldAuthStrategy implements AuthStrategy {
  async validate(data: { email: string; password: string; fullname: string }): Promise<void> {
    if (!data.email || !data.password) {
      throw new Error('Emtpy fields on request body')
    }
  }
}

/**
 * Class for validating data using multiple authentication strategies.
 */
export class AuthValidator {
  private strategies: AuthStrategy[] = []

  /**
   * Adds a new authentication strategy to the validator.
   * @param strategy - The strategy to add.
   */
  addStrategy(strategy: AuthStrategy): void {
    this.strategies.push(strategy)
  }

  /**
   * Validates the provided data using all added strategies.
   * @param data - The data to validate.
   */
  async validate(data: { email: string; password: string; fullname?: string }): Promise<void> {
    for (const strategy of this.strategies) {
      await strategy.validate(data)
    }
  }
}
