import { hash } from '@node-rs/argon2'
import { PrismaTransactionalClient, prisma } from '#services/prisma_service'
import { generateIdFromEntropySize } from 'lucia'
import { BankAccount, Role, SellerVerificationStatus, User, Profile, SellerProfile, Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
//import logger from '@adonisjs/core/services/logger'
import { PrismaPromise } from '@prisma/client/runtime/library'
//import { logger } from '#services/logger_service'

// Zod schemas for input validation
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullname: z.string().min(2)
})

const sellerSchema = userSchema.extend({
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  identityDoc: z.string().optional(),
})

const bankAccountSchema = z.object({
  accountHolderName: z.string().min(1),
  accountNumber: z.string().min(1),
  bankName: z.string().min(1),
  swiftCode: z.string().min(1),
  iban: z.string().optional(),
  routingNumber: z.string().optional(),
})

type UserFactoryData = z.infer<typeof userSchema>
type SellerFactoryData = z.infer<typeof sellerSchema>
type BankAccountData = z.infer<typeof bankAccountSchema>

export class UserFactory {
  /**
   * Create a regular user
   * @param {UserFactoryData} data - User data
   * @returns {Promise<{user: User, profile: Profile}>} Created user and profile
   */
  static async createUser(data: UserFactoryData): Promise<{ user: User; profile: Profile }> {
    try {
      const validatedData = userSchema.parse(data)
      return this.createBaseUser({ ...validatedData, role: Role.USER })
    } catch (error) {
      //logger.error('Error creating user', { error })
      throw new Error('Failed to create user')
    }
  }

  /**
   * Create a seller user with associated regular profile and seller profile
   * @param {SellerFactoryData} data - Seller data
   * @returns {Promise<{user: User, profile: Profile, sellerProfile: SellerProfile}>} Created user, regular profile, and seller profile
   */
  static async createSeller(data: SellerFactoryData): Promise<{ user: User; profile: Profile; sellerProfile: SellerProfile }> {
    try {
      const validatedData = sellerSchema.parse(data)
      return prisma.$transaction(async (tx) => {
        const { user, profile } = await this.createBaseUser({ ...validatedData, role: Role.SELLER }, tx)
        const sellerProfile = await tx.sellerProfile.create({
          data: {
            userId: user.id,
            businessName: validatedData.businessName ?? '',
            businessAddress: validatedData.businessAddress ?? '',
            businessPhone: validatedData.businessPhone ?? '',
            businessEmail: validatedData.email ?? '',
            identityDoc: validatedData.identityDoc,
            verificationStatus: SellerVerificationStatus.PENDING,
          },
        })
        return { user, profile, sellerProfile }
      })
    } catch (error) {
      console.log(error)
      //logger.error('Error creating seller', { error })
      throw new Error('Failed to create seller')
    }
  }

  /**
   * Add a bank account to a seller profile
   * @param {string} sellerId - ID of the seller
   * @param {BankAccountData} bankAccountData - Bank account data
   * @returns {Promise<BankAccount>} Created bank account
   */
  static async addBankAccount(sellerId: string, bankAccountData: BankAccountData): Promise<BankAccount> {
    try {
      const validatedData = bankAccountSchema.parse(bankAccountData)
      return prisma.$transaction(async (tx) => {
        const sellerProfile = await tx.sellerProfile.findUnique({ where: { userId: sellerId } })
        if (!sellerProfile) {
          throw new Error('Seller profile not found')
        }
        return tx.bankAccount.create({
          data: {
            ...validatedData,
            sellerProfileId: sellerProfile.id,
          },
        })
      })
    } catch (error) {
      //logger.error('Error adding bank account', { error, sellerId })
      throw new Error('Failed to add bank account')
    }
  }

  /**
   * Create a moderator user
   * @param {UserFactoryData} data - User data
   * @returns {Promise<{user: User, profile: Profile}>} Created user and profile
   */
  static async createModerator(data: UserFactoryData): Promise<{ user: User; profile: Profile }> {
    try {
      const validatedData = userSchema.parse(data)
      return this.createBaseUser({ ...validatedData, role: Role.MODERATOR })
    } catch (error) {
      //logger.error('Error creating moderator', { error })
      throw new Error('Failed to create moderator')
    }
  }

  /**
   * Create an admin user
   * @param {UserFactoryData} data - User data
   * @returns {Promise<{user: User, profile: Profile}>} Created user and profile
   */
  static async createAdmin(data: UserFactoryData): Promise<{ user: User; profile: Profile }> {
    try {
      const validatedData = userSchema.parse(data)
      return this.createBaseUser({ ...validatedData, role: Role.ADMIN })
    } catch (error) {
      //logger.error('Error creating admin', { error })
      throw new Error('Failed to create admin')
    }
  }

  /**
   * Private method to create a base user with a profile
   * @param {UserFactoryData & { role: Role }} data - User data with role
   * @param {any} tx - Optional transaction object
   * @returns {Promise<{user: User, profile: Profile}>} Created user and profile
   */
  private static async createBaseUser(
    data: UserFactoryData & { role: Role },
    tx?: PrismaTransactionalClient,
  ): Promise<{ user: User; profile: Profile }> {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error(`User with email ${data.email} already exists`);
      }

      if (tx) {
        const passwordHash = await this.hashPassword(data.password)
        const id = generateIdFromEntropySize(32)

        const user = await tx.user.create({
          data: { id, email: data.email, passwordHash, role: data.role },
        })

        const profile = await tx.profile.create({
          data: { userId: id, name: data.fullname },
        })

        return { user, profile }
      }
      else return prisma.$transaction(async (ptx: PrismaTransactionalClient) => {
        const passwordHash = await this.hashPassword(data.password)
        const id = generateIdFromEntropySize(32)

        const user = await ptx.user.create({
          data: { id, email: data.email, passwordHash, role: data.role },
        })
        const profile = await ptx.profile.create({
          data: { userId: id, name: data.fullname },
        })

        return { user, profile }
      })
  }

  /**
   * Private method to hash a password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  private static async hashPassword(password: string): Promise<string> {
    return hash(password, {
      memoryCost: 19456,
      timeCost: 3,
      parallelism: 1,
      outputLen: 64,
    })
  }
}
