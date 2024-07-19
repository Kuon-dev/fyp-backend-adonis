import { inject } from '@adonisjs/core'
import { PrismaTransactionalClient, prisma } from '#services/prisma_service'
import { OrderStatus, UserRepoAccess } from '@prisma/client'
import { generateIdFromEntropySize } from 'lucia'

@inject()
export default class RepoAccessService {
  /**
   * Check if a user has access to a specific repo
   * @param userId - The ID of the user
   * @param repoId - The ID of the repo
   * @param tx - Prisma transactional client
   * @returns A boolean indicating whether the user has access
   */
  public async hasAccess(
    userId: string,
    repoId: string,
    tx: PrismaTransactionalClient
  ): Promise<boolean> {
    const access = await tx.userRepoAccess.findUnique({
      where: {
        userId_repoId: {
          userId,
          repoId,
        },
      },
    })

    if (!access) {
      return false
    }

    // Check if access has expired
    if (access.expiresAt && access.expiresAt < new Date()) {
      return false
    }

    return true
  }

  /**
   * Grant access to a repo for a user based on a successful order
   * @param orderId - The ID of the completed order
   * @param tx - Prisma transactional client
   * @returns A boolean indicating whether access was successfully granted
   */
  public async grantAccess(orderId: string, tx: PrismaTransactionalClient): Promise<boolean> {
    try {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { codeRepo: true },
      })

      if (!order || order.status !== OrderStatus.SUCCEEDED) {
        console.error(`Invalid order or order not completed: ${orderId}`)
        return false
      }

      await this.upsertUserRepoAccess(order.userId, order.codeRepoId, order.id, tx)
      return true
    } catch (error) {
      console.error(`Error granting access for order ${orderId}:`, error)
      return false
    }
  }

  /**
   * Create or update a UserRepoAccess entry
   * @param userId - The ID of the user
   * @param repoId - The ID of the repo
   * @param orderId - The ID of the order
   * @param tx - Prisma transactional client
   * @returns The created or updated UserRepoAccess entry
   */
  private async upsertUserRepoAccess(
    userId: string,
    repoId: string,
    orderId: string,
    tx: PrismaTransactionalClient
  ): Promise<UserRepoAccess> {
    return tx.userRepoAccess.upsert({
      where: {
        userId_repoId: {
          userId,
          repoId,
        },
      },
      update: {
        orderId,
        grantedAt: new Date(),
      },
      create: {
        id: generateIdFromEntropySize(32),
        userId,
        repoId,
        orderId,
        grantedAt: new Date(),
      },
    })
  }

  /**
   * Get all repos a user has access to
   * @param userId - The ID of the user
   * @param tx - Prisma transactional client
   * @returns An array of repo IDs the user has access to
   */
  public async getUserAccessibleRepos(
    userId: string,
    tx: PrismaTransactionalClient
  ): Promise<string[]> {
    const accesses = await tx.userRepoAccess.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { repoId: true },
    })

    return accesses.map((access) => access.repoId)
  }

  /**
   * Get all users who have access to a specific repo
   * @param repoId - The ID of the repo
   * @param tx - Prisma transactional client
   * @returns An array of user IDs who have access to the repo
   */
  public async getRepoAccessibleUsers(
    repoId: string,
    tx: PrismaTransactionalClient
  ): Promise<string[]> {
    const accesses = await tx.userRepoAccess.findMany({
      where: {
        repoId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { userId: true },
    })

    return accesses.map((access) => access.userId)
  }
}
