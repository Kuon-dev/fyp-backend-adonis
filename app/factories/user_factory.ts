// user_factory.ts
import { hash } from '@node-rs/argon2'
import { prisma } from '#services/prisma_service'
import { generateIdFromEntropySize } from 'lucia'
import { BankAccount, Role, SellerVerificationStatus } from '@prisma/client'

/**
 * Interface defining the required data for creating a user
 */
interface UserFactoryData {
  email: string
  password: string
  fullname: string
}

/**
 * Interface defining the additional data for creating a seller
 */
interface SellerFactoryData extends UserFactoryData {
  businessName: string
  businessAddress: string
  businessPhone: string
  identityDoc?: string
  bankAccount?: {
    accountHolderName: string
    accountNumber: string
    bankName: string
    swiftCode: string
    iban?: string
    routingNumber?: string
  }
}

/**
 * UserFactory class for creating different types of users
 */
export class UserFactory {
  /**
   * Create a regular user
   * @param {UserFactoryData} data - User data
   * @returns {Promise<{user: User, profile: Profile}>} Created user and profile
   */
  static async createUser({ email, password, fullname }: UserFactoryData) {
    return this.createBaseUser({ email, password, fullname, role: Role.USER })
  }

  /**
   * Create a seller user with associated seller profile and optional bank account
   * @param {SellerFactoryData} data - Seller data
   * @returns {Promise<{user: User, sellerProfile: SellerProfile, bankAccount?: BankAccount}>} Created user, seller profile, and optional bank account
   */
  static async createSeller({
    email,
    password,
    fullname,
  }: SellerFactoryData) {
    return prisma.$transaction(async (prisma) => {
      const passwordHash = await this.hashPassword(password)
      const id = generateIdFromEntropySize(32)

      const user = await prisma.user.create({
        data: { id, email, passwordHash, role: Role.SELLER },
      })

      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          businessName: '',
          businessAddress: '',
          businessPhone: '',
          businessEmail: email,
          identityDoc: null,
          verificationStatus: SellerVerificationStatus.PENDING,
        },
      })
      return { user, sellerProfile }
    })
  }

  /**
   * Create a moderator user
   * @param {UserFactoryData} data - User data
   * @returns {Promise<{user: User, profile: Profile}>} Created user and profile
   */
  static async createModerator({ email, password, fullname }: UserFactoryData) {
    return this.createBaseUser({ email, password, fullname, role: Role.MODERATOR })
  }

  /**
   * Create an admin user
   * @param {UserFactoryData} data - User data
   * @returns {Promise<{user: User, profile: Profile}>} Created user and profile
   */
  static async createAdmin({ email, password, fullname }: UserFactoryData) {
    return this.createBaseUser({ email, password, fullname, role: Role.ADMIN })
  }

  /**
   * Private method to create a base user with a profile
   * @param {UserFactoryData & { role: Role }} data - User data with role
   * @returns {Promise<{user: User, profile: Profile}>} Created user and profile
   */
  private static async createBaseUser({
    email,
    password,
    fullname,
    role,
  }: UserFactoryData & { role: Role }) {
    return prisma.$transaction(async (prisma) => {
      const passwordHash = await this.hashPassword(password)
      const id = generateIdFromEntropySize(32)

      const user = await prisma.user.create({
        data: { id, email, passwordHash, role },
      })

      const profile = await prisma.profile.create({
        data: { userId: id, name: fullname },
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
