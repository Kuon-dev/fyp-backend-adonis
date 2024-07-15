// user_service.ts
import { prisma } from '#services/prisma_service'
import { hash } from '@node-rs/argon2'
import { UserFactory } from '../factories/user_factory.js'
import type { Role, SellerProfile, Profile } from '@prisma/client'
import type { User } from 'lucia'

interface UserCreationData {
  email: string
  password: string
  fullname: string
  role: Role
}

interface UserProfileUpdateData {
  email?: string
  password?: string
  fullname?: string
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
}

/**
 * Service class for managing users.
 */
export class UserService {
  /**
   * Creates a user with the specified role.
   *
   * @param {UserCreationData} data - The user creation data.
   * @returns {Promise<User>} - The created user.
   * @throws {Error} - If an invalid role is provided.
   */
  async createUser(data: UserCreationData): Promise<User> {
    const { role, ...userData } = data
    switch (role) {
      case 'USER':
        return (await UserFactory.createUser(userData)).user
      case 'SELLER':
        return (await UserFactory.createSeller(userData)).user
      case 'MODERATOR':
        return (await UserFactory.createModerator(userData)).user
      case 'ADMIN':
        return (await UserFactory.createAdmin(userData)).user
      default:
        throw new Error(`Invalid role: ${role}`)
    }
  }

  /**
   * Retrieves a user by their email.
   *
   * @param {string} email - The email of the user.
   * @returns {Promise<User>} - The user.
   * @throws {Error} - If the user is not found.
   */
  async getUserByEmail(email: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: {
        profile: true,
        sellerProfile: {
          include: {
            bankAccount: true,
          },
        },
      },
    })

    if (!user) {
      throw new Error(`User with email ${email} not found.`)
    }

    return user
  }

  /**
   * Retrieves all users.
   *
   * @returns {Promise<User[]>} - All users.
   */
  async getAllUsers(): Promise<{ id: string; email: string; role: Role }[]> {
    // only return the ncessary data
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        bannedUntil: true,
        //fullname: true,
        role: true,
        sellerProfile: {
          include: {
            bankAccount: true,
          },
          //select: {
          //  businessName: true,
          //  businessAddress: true,
          //  businessPhone: true,
          //  businessEmail: true,
          //  identityDoc: true,
          //
          //  bankAccount: true,
          //  verificationStatus: true,
          //},
        },
      },
    })
  }

  /**
   * Retrieves paginated users.
   *
   * @param {number} page - The page number.
   * @param {number} pageSize - The number of users per page.
   * @returns {Promise<{ users: User[], total: number }>} - The paginated users and total count.
   */
  async getPaginatedUsers(
    page: number,
    pageSize: number
  ): Promise<{ users: User[]; total: number }> {
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({
        where: { deletedAt: null },
      }),
    ])

    return { users, total }
  }

  /*
   * Retrieves a user by their ID.
   *
   * @param {string} id - The ID of the user.
   * @returns {Promise<User>} - The user.
   * @throws {Error} - If the user is not found.
   *
   */

  async getUserProfileById(id: string): Promise<Profile | SellerProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    })
    if (!user) {
      throw new Error(`User with id ${id} not found.`)
    }

    if (user.role === 'SELLER') {
      const profile = await prisma.sellerProfile.findFirst({
        where: { userId: id },
      })

      return profile
    } else {
      const profile = await prisma.profile.findFirst({
        where: { userId: id },
      })

      return profile ?? null
    }
  }

  /**
   * Updates a user with the specified data.
   *
   * @param {string} email - The email of the user to update.
   * @param {Partial<UserCreationData>} data - The data to update the user with.
   * @returns {Promise<User>} - The updated user.
   */
  async updateUser(email: string, data: Partial<UserCreationData>): Promise<User> {
    const user = await prisma.user.update({
      where: { email, deletedAt: null },
      data,
    })

    return user
  }

  /**
   * Updates a user's profile based on their role.
   *
   * @param {string} email - The email of the user whose profile is to be updated.
   * @param {UserProfileUpdateData} data - The profile data to update.
   * @returns {Promise<User>} - The updated user.
   * @throws {Error} - If the user is not found or the role is invalid.
   */
  async updateUserProfile(email: string, data: UserProfileUpdateData): Promise<User> {
    const user = await this.getUserByEmail(email)

    switch (user.role) {
      case 'USER':
      case 'MODERATOR':
      case 'ADMIN':
        const updatedUser = await prisma.user.update({
          where: { email },
          data: { passwordHash: data.password ? await hash(data.password) : undefined },
        })

        await prisma.profile.update({
          where: { userId: user.id },
          data: { name: data.fullname },
        })

        return updatedUser

      case 'SELLER':
        await prisma.sellerProfile.update({
          where: { userId: user.id },
          data: {
            businessName: data.businessName,
            businessAddress: data.businessAddress,
            businessPhone: data.businessPhone,
            businessEmail: data.businessEmail,
          },
        })

        return user

      default:
        throw new Error(`Invalid role: ${user.role}`)
    }
  }

  /**
   * Soft deletes a user by their email.
   *
   * @param {string} email - The email of the user to soft delete.
   * @returns {Promise<User>} - The soft deleted user.
   */
  async deleteUser(email: string): Promise<User> {
    const user = await prisma.user.update({
      where: { email },
      data: { deletedAt: new Date() },
    })

    return user
  }

  /**
   * Bans a user by setting their status to 'banned' and recording the reason.
   * Also hides all repositories owned by the user.
   *
   * @param {string} email - The email of the user to ban.
   * @returns {Promise<User>} - The banned user.
   */
  async banUser(email: string): Promise<User> {
    return prisma.$transaction(async (tx) => {
      // Update user status to banned
      const user = await tx.user.update({
        where: { email, deletedAt: null },
        data: {
          bannedUntil: new Date(),
        },
      })

      // Update all repositories owned by the user to 'bannedUser'
      await tx.codeRepo.updateMany({
        where: { userId: user.id },
        data: { status: 'bannedUser' },
      })

      return user
    })
  }
}
