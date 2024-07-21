import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'
import SalesService from '#services/sales_service'
import { CodeRepoStatus, OrderStatus, Role, SupportTicketStatus, UserCommentFlag, Language, SellerVerificationStatus } from '@prisma/client'
import SupportTicketService from './support_service.js'
import logger from '@adonisjs/core/services/logger'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const languageEnum = z.enum(['JSX', 'TSX', 'Unknown']);

const topSellingRepoSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: languageEnum,
  totalRevenue: z.number()
});

const financialInsightsSchema = z.object({
  currentMonthRevenue: z.number(),
  previousMonthRevenue: z.number(),
  revenueGrowth: z.number(),
  pendingPayouts: z.number(),
  processedPayouts: z.number(),
  topSellingRepos: z.array(topSellingRepoSchema),
  revenueByLanguage: z.record(languageEnum, z.number())
});

type SalesAggregateItem = {
  id: string
  sellerId: string
  date: Date
  revenue: number
  salesCount: number
}

type DashboardData = {
  salesOverview: {
    totalRevenue: number
    totalSales: number
    averageOrderValue: number
    dailySales: { revenue: number; salesCount: number }
    weeklySales: { revenue: number; salesCount: number }
    monthlySales: { revenue: number; salesCount: number }
  }
  userStatistics: {
    totalUsers: number
    userTypeCounts: Record<Role, number>
    newUsers: number
  }
  repoMetrics: {
    totalRepos: number
    pendingApprovalRepos: number
    popularRepos: { id: string; name: string; _count: { orders: number } }[]
    recentRepos: { id: string; name: string; createdAt: Date }[]
  }
  sellerPerformance: {
    topSellers: {
      id: string
      email: string
      sellerProfile: { verificationStatus: SellerVerificationStatus; balance: number } | null
      profile: { name: string | null } | null
      _count: { orders: number }
    }[]
    newSellerApplications: number
  }
  orderManagement: {
    recentOrders: {
      id: string
      userId: string
      codeRepoId: string
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
      status: OrderStatus
      totalAmount: number
      stripePaymentIntentId: string | null
      stripePaymentMethodId: string | null
      payoutRequestId: string | null
      user: { email: string }
      codeRepo: { name: string }
    }[]
    orderStatusCounts: Record<OrderStatus, number>
  }
  financialInsights: {
    currentMonthRevenue: number
    previousMonthRevenue: number
    revenueGrowth: number
    pendingPayouts: number
    processedPayouts: number
    topSellingRepos: { id: string; name: string; language: Language; totalRevenue: number }[]
  }
  supportTickets: {
    openTicketsCount: number
    averageResponseTime: number | null
    ticketStatusCounts: Record<SupportTicketStatus, number>
  }
  contentModeration: {
    flaggedReviews: number
    flaggedComments: number
    totalFlaggedContent: number
  }
}

@inject()
export default class AdminDashboardService {
  constructor(
    private salesService: SalesService,
    private supportTicketService: SupportTicketService
  ) {}

  public async getDashboardData(): Promise<DashboardData> {
    try {
      const now = DateTime.now()
      const startOfDay = now.startOf('day').toJSDate()
      const startOfWeek = now.startOf('week').toJSDate()
      const startOfMonth = now.startOf('month').toJSDate()

      const [
        salesOverview,
        userStatistics,
        repoMetrics,
        sellerPerformance,
        orderManagement,
        financialInsights,
        supportTickets,
        contentModeration
      ] = await Promise.all([
        this.getSalesOverview(startOfDay, startOfWeek, startOfMonth),
        this.getUserStatistics(),
        this.getRepoMetrics(),
        this.getSellerPerformance(),
        this.getOrderManagement(),
        this.getFinancialInsights(),
        this.getSupportTickets(),
        this.getContentModeration()
      ])

      return {
        salesOverview,
        userStatistics,
        repoMetrics,
        sellerPerformance,
        orderManagement,
        financialInsights,
        supportTickets,
        contentModeration
      }
    } catch (error) {
      logger.error('Error in getDashboardData:', error)
      throw new Error('Failed to retrieve dashboard data')
    }
  }

  private async getSalesOverview(startOfDay: Date, startOfWeek: Date, startOfMonth: Date) {
    try {
      const [sellers, totalRevenue, totalSales] = await Promise.all([
        prisma.user.findMany({
          where: { role: Role.SELLER },
          select: { id: true }
        }),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { status: OrderStatus.SUCCEEDED }
        }),
        prisma.order.count({ where: { status: OrderStatus.SUCCEEDED } })
      ])

      const now = new Date()

      const salesPromises = sellers.flatMap(seller => [
        this.salesService.getSalesAggregate(seller.id, startOfDay, now),
        this.salesService.getSalesAggregate(seller.id, startOfWeek, now),
        this.salesService.getSalesAggregate(seller.id, startOfMonth, now)
      ])

      const allSalesData = await Promise.all(salesPromises)

      const [dailySales, weeklySales, monthlySales] = [
        allSalesData.filter((_, index) => index % 3 === 0),
        allSalesData.filter((_, index) => index % 3 === 1),
        allSalesData.filter((_, index) => index % 3 === 2)
      ]

      const aggregateSales = (sales: SalesAggregateItem[][]) => {
        return sales.reduce((acc, sellerSales) => {
          const totalRevenue = sellerSales.reduce((sum, sale) => sum + sale.revenue, 0)
          const totalSalesCount = sellerSales.reduce((sum, sale) => sum + sale.salesCount, 0)
          return {
            revenue: acc.revenue + totalRevenue,
            salesCount: acc.salesCount + totalSalesCount
          }
        }, { revenue: 0, salesCount: 0 })
      }

      return {
        totalRevenue: totalRevenue._sum.totalAmount ?? 0,
        totalSales,
        averageOrderValue: totalSales > 0 ? (totalRevenue._sum.totalAmount ?? 0) / totalSales : 0,
        dailySales: aggregateSales(dailySales),
        weeklySales: aggregateSales(weeklySales),
        monthlySales: aggregateSales(monthlySales)
      }
    } catch (error) {
      logger.error('Error in getSalesOverview:', error)
      throw new Error('Failed to retrieve sales overview')
    }
  }

  private async getUserStatistics() {
    try {
      const [totalUsers, userTypeCounts, newUsers] = await Promise.all([
        prisma.user.count(),
        prisma.user.groupBy({
          by: ['role'],
          _count: true
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: DateTime.now().minus({ days: 30 }).toJSDate()
            }
          }
        })
      ])

      return {
        totalUsers,
        userTypeCounts: userTypeCounts.reduce((acc, { role, _count }) => {
          acc[role as Role] = _count
          return acc
        }, {} as Record<Role, number>),
        newUsers
      }
    } catch (error) {
      logger.error('Error in getUserStatistics:', error)
      throw new Error('Failed to retrieve user statistics')
    }
  }

  private async getRepoMetrics() {
    try {
      const [totalRepos, pendingApprovalRepos, popularRepos, recentRepos] = await Promise.all([
        prisma.codeRepo.count(),
        prisma.codeRepo.count({
          where: { status: CodeRepoStatus.pending }
        }),
        prisma.codeRepo.findMany({
          take: 5,
          orderBy: { orders: { _count: 'desc' } },
          select: { id: true, name: true, _count: { select: { orders: true } } }
        }),
        prisma.codeRepo.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, createdAt: true }
        })
      ])

      return {
        totalRepos,
        pendingApprovalRepos,
        popularRepos,
        recentRepos
      }
    } catch (error) {
      logger.error('Error in getRepoMetrics:', error)
      throw new Error('Failed to retrieve repo metrics')
    }
  }

  private async getSellerPerformance() {
    try {
      const [topSellers, newSellerApplications] = await Promise.all([
        prisma.user.findMany({
          where: { role: Role.SELLER },
          take: 5,
          orderBy: { orders: { _count: 'desc' } },
          select: {
            id: true,
            email: true,
            profile: { select: { name: true } },
            _count: { select: { orders: true } },
            sellerProfile: {
              select: {
                balance: true,
                verificationStatus: true
              }
            }
          }
        }),
        prisma.sellerProfile.count({
          where: { verificationStatus: 'PENDING' }
        })
      ])

      return {
        topSellers,
        newSellerApplications
      }
    } catch (error) {
      logger.error('Error in getSellerPerformance:', error)
      throw new Error('Failed to retrieve seller performance data')
    }
  }

  private async getOrderManagement() {
    try {
      const [recentOrders, orderStatusCounts] = await Promise.all([
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { email: true } },
            codeRepo: { select: { name: true } }
          }
        }),
        prisma.order.groupBy({
          by: ['status'],
          _count: true
        })
      ])

      return {
        recentOrders,
        orderStatusCounts: orderStatusCounts.reduce((acc, { status, _count }) => {
          acc[status as OrderStatus] = _count
          return acc
        }, {} as Record<OrderStatus, number>)
      }
    } catch (error) {
      logger.error('Error in getOrderManagement:', error)
      throw new Error('Failed to retrieve order management data')
    }
  }

  private async getFinancialInsights() {
    try {
      const now = DateTime.now()
      const startOfMonth = now.startOf('month').toJSDate()
      const startOfPreviousMonth = now.minus({ months: 1 }).startOf('month').toJSDate()

      const [
        currentMonthRevenue,
        previousMonthRevenue,
        pendingPayouts,
        processedPayouts,
        topSellingRepos,
      ] = await Promise.all([
        this.getMonthlyRevenue(startOfMonth),
        this.getMonthlyRevenue(startOfPreviousMonth, startOfMonth),
        this.getPendingPayouts(),
        this.getProcessedPayouts(),
        this.getTopSellingRepos(),
      ])

      const revenueGrowth = this.calculateRevenueGrowth(currentMonthRevenue, previousMonthRevenue)

      logger.info('Financial Insights:', {
        currentMonthRevenue,
        previousMonthRevenue,
        revenueGrowth,
        pendingPayouts,
        processedPayouts,
        topSellingRepos,
      })

      return {
        currentMonthRevenue,
        previousMonthRevenue,
        revenueGrowth,
        pendingPayouts,
        processedPayouts,
        topSellingRepos,
      }
    } catch (error) {
      logger.error('Error in getFinancialInsights:', error)
      return {
        currentMonthRevenue: 0,
        previousMonthRevenue: 0,
        revenueGrowth: 0,
        pendingPayouts: 0,
        processedPayouts: 0,
        topSellingRepos: [],
        revenueByLanguage: {}
      }
    }
  }

  private async getMonthlyRevenue(startDate: Date, endDate: Date = new Date()) {
    const result = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: OrderStatus.SUCCEEDED,
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      }
    })
    return result._sum.totalAmount ?? 0
  }

  private calculateRevenueGrowth(currentRevenue: number, previousRevenue: number) {
    if (previousRevenue === 0) return currentRevenue > 0 ? 100 : 0
    return ((currentRevenue - previousRevenue) / previousRevenue) * 100
  }

  private async getPendingPayouts() {
    return prisma.payoutRequest.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'PENDING' }
    }).then(result => result._sum.totalAmount ?? 0)
  }

  private async getProcessedPayouts() {
    return prisma.payout.aggregate({
      _sum: { totalAmount: true }
    }).then(result => result._sum.totalAmount ?? 0)
  }

  private async getTopSellingRepos(limit: number = 5) {
    const repos = await prisma.codeRepo.findMany({
      take: limit,
      select: {
        id: true,
        name: true,
        language: true,
        orders: {
          where: { status: OrderStatus.SUCCEEDED },
          select: { totalAmount: true }
        }
      },
      orderBy: {
        orders: {
          _count: 'desc'
        }
      }
    })

    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      language: repo.language,
      totalRevenue: repo.orders.reduce((sum, order) => sum + order.totalAmount, 0)
    }))
  }

  private async getRevenueByLanguage() {
    const revenueByRepo = await prisma.order.groupBy({
      by: ['codeRepoId'],
      _sum: { totalAmount: true },
      where: { status: OrderStatus.SUCCEEDED }
    })

    const repoLanguages = await prisma.codeRepo.findMany({
      where: { id: { in: revenueByRepo.map(r => r.codeRepoId) } },
      select: { id: true, language: true }
    })

    const languageMap = new Map(repoLanguages.map(r => [r.id, r.language]))

    return revenueByRepo.reduce((acc, { codeRepoId, _sum }) => {
      const language = languageMap.get(codeRepoId) ?? 'Unknown'
      acc[language] = (acc[language] ?? 0) + (_sum.totalAmount ?? 0)
      return acc
    }, {} as Record<Language | 'Unknown', number>)
  }

  private async getSupportTickets() {
    try {
      const [openTickets, ticketStatusCounts, completedTickets] = await Promise.all([
        this.supportTicketService.getTicketsByStatus(SupportTicketStatus.todo),
        prisma.supportTicket.groupBy({
          by: ['status'],
          _count: true
        }),
        prisma.supportTicket.findMany({
          where: {
            status: {
              in: [SupportTicketStatus.inProgress, SupportTicketStatus.done]
            }
          },
          select: {
            createdAt: true,
            updatedAt: true
          }
        })
      ])

      const totalResponseTime = completedTickets.reduce((total, ticket) => {
        return total + ticket.updatedAt.getTime() - ticket.createdAt.getTime()
      }, 0)

      const averageResponseTime = completedTickets.length > 0
        ? totalResponseTime / completedTickets.length / (1000 * 60 * 60) // Convert to hours
        : null

      return {
        openTicketsCount: openTickets.length,
        averageResponseTime,
        ticketStatusCounts: ticketStatusCounts.reduce((acc, { status, _count }) => {
          acc[status as SupportTicketStatus] = _count
          return acc
        }, {} as Record<SupportTicketStatus, number>)
      }
    } catch (error) {
      logger.error('Error in getSupportTickets:', error)
      throw new Error('Failed to retrieve support ticket data')
    }
  }

  private async getContentModeration() {
    try {
      const [flaggedReviews, flaggedComments] = await Promise.all([
        prisma.review.count({
          where: { flag: { not: UserCommentFlag.NONE } }
        }),
        prisma.comment.count({
          where: { flag: { not: UserCommentFlag.NONE } }
        })
      ])

      return {
        flaggedReviews,
        flaggedComments,
        totalFlaggedContent: flaggedReviews + flaggedComments
      }
    } catch (error) {
      logger.error('Error in getContentModeration:', error)
      throw new Error('Failed to retrieve content moderation data')
    }
  }
}
