import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import RepoAccessService from '#services/repo_access_service'
import { OrderStatus } from '@prisma/client'

@inject()
export default class UserDashboardService {
  /**
   * Get user dashboard data
   * @param userId - The ID of the user
   * @returns Promise<object> Dashboard data
   */
  public async getDashboardData(userId: string): Promise<object> {
    try {
      const [
        purchaseHistory,
        accountInfo,
        usageStatistics,
        recommendations,
      ] = await Promise.all([
        this.getPurchaseHistory(userId),
        this.getAccountInfo(userId),
        this.getUsageStatistics(userId),
        this.getRecommendations(userId),
      ])

      return {
        purchaseHistory,
        accountInfo,
        usageStatistics,
        recommendations,
      }
    } catch (error) {
      console.error('Error in getDashboardData:', error)
      throw new Error('Failed to retrieve dashboard data')
    }
  }

  private async getPurchaseHistory(userId: string) {
    try {
      const recentPurchases = await prisma.order.findMany({
        where: { userId, status: OrderStatus.SUCCEEDED },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { codeRepo: { select: { name: true } } }
      })

      const totalSpent = await prisma.order.aggregate({
        where: { userId, status: OrderStatus.SUCCEEDED },
        _sum: { totalAmount: true }
      })

      const componentsBought = await prisma.order.count({
        where: { userId, status: OrderStatus.SUCCEEDED }
      })

      return {
        recentPurchases,
        totalSpent: totalSpent._sum.totalAmount || 0,
        componentsBought
      }
    } catch (error) {
      console.error('Error in getPurchaseHistory:', error)
      throw new Error('Failed to retrieve purchase history')
    }
  }

  private async getAccountInfo(userId: string) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          emailVerified: true,
          profile: true,
          createdAt: true
        }
      })
    } catch (error) {
      console.error('Error in getAccountInfo:', error)
      throw new Error('Failed to retrieve account info')
    }
  }

  private async getUsageStatistics(userId: string) {
    try {
      const frequentlyPurchased = await prisma.order.groupBy({
        by: ['codeRepoId'],
        where: { userId, status: OrderStatus.SUCCEEDED },
        _count: { codeRepoId: true },
        orderBy: { _count: { codeRepoId: 'desc' } },
        take: 5
      })

      const repoIds = frequentlyPurchased.map(fp => fp.codeRepoId)
      const repoDetails = await prisma.codeRepo.findMany({
        where: { id: { in: repoIds } },
        select: { id: true, name: true }
      })

      return {
        mostUsedComponents: frequentlyPurchased.map(fp => ({
          ...repoDetails.find(rd => rd.id === fp.codeRepoId),
          usageCount: fp._count.codeRepoId
        }))
      }
    } catch (error) {
      console.error('Error in getUsageStatistics:', error)
      throw new Error('Failed to retrieve usage statistics')
    }
  }

  private async getRecommendations(userId: string) {
    try {
      const userPurchases = await prisma.order.findMany({
        where: { userId, status: OrderStatus.SUCCEEDED },
        select: { codeRepoId: true }
      })

      const purchasedRepoIds = userPurchases.map(p => p.codeRepoId)

      const popularComponents = await prisma.codeRepo.findMany({
        where: {
          id: { notIn: purchasedRepoIds },
          status: 'active',
          visibility: 'public'
        },
        orderBy: { orders: { _count: 'desc' } },
        take: 5,
        select: { id: true, name: true }
      })

      return { recommendations: popularComponents }
    } catch (error) {
      console.error('Error in getRecommendations:', error)
      throw new Error('Failed to retrieve recommendations')
    }
  }
}
