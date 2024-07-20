import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'
import SalesService from '#services/sales_service'
import { CodeRepoStatus, OrderStatus, Role, SupportTicketStatus, UserCommentFlag, Language } from '@prisma/client'
import SupportTicketService from './support_service.js'
import { Prisma } from '@prisma/client'
import Logger from '@ioc:Adonis/Core/Logger'

@inject()
export default class AdminDashboardService {
  constructor(
    private salesService: SalesService,
    private supportTicketService: SupportTicketService
  ) {}

  public async getDashboardData(): Promise<object> {
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
      Logger.error('Error in getDashboardData:', error)
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
      const sellerIds = sellers.map(s => s.id)

      const [dailySales, weeklySales, monthlySales] = await Promise.all([
        this.salesService.getAggregatedSales(sellerIds, startOfDay, now),
        this.salesService.getAggregatedSales(sellerIds, startOfWeek, now),
        this.salesService.getAggregatedSales(sellerIds, startOfMonth, now)
      ])

      return {
        totalRevenue: totalRevenue._sum.totalAmount ?? 0,
        totalSales,
        averageOrderValue: totalSales > 0 ? (totalRevenue._sum.totalAmount ?? 0) / totalSales : 0,
        dailySales,
        weeklySales,
        monthlySales
      }
    } catch (error) {
      Logger.error('Error in getSalesOverview:', error)
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
      Logger.error('Error in getUserStatistics:', error)
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
      Logger.error('Error in getRepoMetrics:', error)
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
      Logger.error('Error in getSellerPerformance:', error)
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
      Logger.error('Error in getOrderManagement:', error)
      throw new Error('Failed to retrieve order management data')
    }
  }

  private async getFinancialInsights() {
    try {
      const [revenueByCategory, pendingPayouts, totalPayouts] = await Promise.all([
        prisma.order.groupBy({
          by: ['codeRepoId'],
          _sum: {
            totalAmount: true
          },
          where: {
            status: OrderStatus.SUCCEEDED,
            codeRepo: {
              isNot: null as any
            }
          },
          orderBy: {
            _sum: {
              totalAmount: 'desc'
            }
          },
        }),
        prisma.payoutRequest.count({
          where: { status: 'PENDING' }
        }),
        prisma.payout.aggregate({
          _sum: { totalAmount: true }
        })
      ])

      const revenueWithLanguage = await prisma.codeRepo.findMany({
        where: { id: { in: revenueByCategory.map(c => c.codeRepoId) } },
        select: { id: true, language: true }
      })

      const revenueMap = new Map(revenueByCategory.map(c => [c.codeRepoId, c._sum.totalAmount ?? 0]))
      const languageMap = new Map(revenueWithLanguage.map(r => [r.id, r.language]))

      const revenueByLanguage = Array.from(revenueMap.entries()).map(([id, revenue]) => ({
        language: languageMap.get(id) ?? 'Unknown',
        revenue
      }))

      return {
        revenueByCategory: revenueByLanguage,
        pendingPayouts,
        totalPayoutsProcessed: totalPayouts._sum.totalAmount ?? 0
      }
    } catch (error) {
      Logger.error('Error in getFinancialInsights:', error)
      throw new Error('Failed to retrieve financial insights')
    }
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
      Logger.error('Error in getSupportTickets:', error)
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
      Logger.error('Error in getContentModeration:', error)
      throw new Error('Failed to retrieve content moderation data')
    }
  }
}
