import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'
import { UserCommentFlag, Role } from '@prisma/client'

@inject()
export default class ModeratorDashboardService {
  /**
   * Get moderator dashboard data
   * @param moderatorId - The ID of the moderator
   * @returns Promise<object> Dashboard data
   */
  public async getDashboardData(moderatorId: string): Promise<object> {
    const now = DateTime.now()
    const startOfDay = now.startOf('day').toJSDate()
    const startOfWeek = now.startOf('week').toJSDate()
    const startOfMonth = now.startOf('month').toJSDate()

    const [
      contentModerationOverview,
      moderationActivity,
      userReportManagement,
      contentAnalytics,
      userManagement,
      reviewAndCommentMetrics,
      moderationQueue,
      moderatorPerformance
    ] = await Promise.all([
      this.getContentModerationOverview(),
      this.getModerationActivity(moderatorId, startOfDay, startOfWeek, startOfMonth),
      this.getUserReportManagement(),
      this.getContentAnalytics(),
      this.getUserManagement(),
      this.getReviewAndCommentMetrics(),
      this.getModerationQueue(),
      this.getModeratorPerformance(moderatorId)
    ])

    return {
      contentModerationOverview,
      moderationActivity,
      userReportManagement,
      contentAnalytics,
      userManagement,
      reviewAndCommentMetrics,
      moderationQueue,
      moderatorPerformance
    }
  }

  private async getContentModerationOverview() {
    const flaggedReviews = await prisma.review.count({
      where: { flag: { not: UserCommentFlag.NONE } }
    })

    const flaggedComments = await prisma.comment.count({
      where: { flag: { not: UserCommentFlag.NONE } }
    })

    const awaitingModeration = await prisma.review.count({
      where: { flag: { not: UserCommentFlag.NONE } }
    }) + await prisma.comment.count({
      where: { flag: { not: UserCommentFlag.NONE } }
    })

    const recentFlaggedContent = await prisma.review.findMany({
      where: { flag: { not: UserCommentFlag.NONE } },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { email: true } } }
    })

    return {
      totalFlaggedContent: flaggedReviews + flaggedComments,
      awaitingModeration,
      recentFlaggedContent
    }
  }

  private async getModerationActivity(moderatorId: string, startOfDay: Date, startOfWeek: Date, startOfMonth: Date) {
    const moderatedLast24Hours = await this.getModeratedCount(moderatorId, startOfDay)
    const moderatedLast7Days = await this.getModeratedCount(moderatorId, startOfWeek)
    const moderatedLast30Days = await this.getModeratedCount(moderatorId, startOfMonth)

    return {
      moderatedLast24Hours,
      moderatedLast7Days,
      moderatedLast30Days
    }
  }

  private async getModeratedCount(moderatorId: string, startDate: Date) {
    const reviewCount = await prisma.review.count({
      where: {
        votes: {
          some: {
            userId: moderatorId,
            createdAt: { gte: startDate }
          }
        }
      }
    })

    const commentCount = await prisma.comment.count({
      where: {
        votes: {
          some: {
            userId: moderatorId,
            createdAt: { gte: startDate }
          }
        }
      }
    })

    return reviewCount + commentCount
  }

  private async getUserReportManagement() {
    // Note: This method assumes you have a UserReport model. If not, you may need to adjust this.
    const recentReports = await prisma.supportTicket.findMany({
      where: { type: 'USER_REPORT' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } }
      }
    })

    const openReports = await prisma.supportTicket.count({
      where: { 
        type: 'USER_REPORT',
        status: 'todo'
      }
    })

    return { recentReports, openReports }
  }

  private async getContentAnalytics() {
    const activeDiscussions = await prisma.codeRepo.findMany({
      take: 5,
      orderBy: { reviews: { _count: 'desc' } },
      select: {
        id: true,
        name: true,
        _count: { select: { reviews: true } }
      }
    })

    // Trending topics would require more complex text analysis
    // This is a simplified version looking at frequent words in recent reviews
    const recentReviews = await prisma.review.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: { content: true }
    })

    const words = recentReviews.flatMap(review => review.content.split(/\s+/))
    const wordFrequency = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const trendingTopics = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word)

    return { activeDiscussions, trendingTopics }
  }

  private async getUserManagement() {
    const recentBans = await prisma.user.findMany({
      where: { bannedUntil: { not: null } },
      take: 5,
      orderBy: { bannedUntil: 'desc' },
      select: { id: true, email: true, bannedUntil: true }
    })

    const usersWithMultipleFlags = await prisma.user.findMany({
      where: {
        OR: [
          { reviews: { some: { flag: { not: UserCommentFlag.NONE } } } },
          { comments: { some: { flag: { not: UserCommentFlag.NONE } } } }
        ]
      },
      take: 10,
      select: {
        id: true,
        email: true,
        _count: {
          select: {
            reviews: { where: { flag: { not: UserCommentFlag.NONE } } },
            comments: { where: { flag: { not: UserCommentFlag.NONE } } }
          }
        }
      },
      orderBy: {
        reviews: { _count: 'desc' }
      }
    })

    return { recentBans, usersWithMultipleFlags }
  }

  private async getReviewAndCommentMetrics() {
    const totalReviews = await prisma.review.count()
    const totalComments = await prisma.comment.count()

    const averageRating = await prisma.review.aggregate({
      _avg: { rating: true }
    })

    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      _count: true
    })

    return {
      totalReviews,
      totalComments,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.reduce((acc, { rating, _count }) => {
        acc[rating] = _count
        return acc
      }, {} as Record<number, number>)
    }
  }

  private async getModerationQueue() {
    const pendingReviews = await prisma.review.findMany({
      where: { flag: { not: UserCommentFlag.NONE } },
      take: 10,
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true } } }
    })

    const pendingComments = await prisma.comment.findMany({
      where: { flag: { not: UserCommentFlag.NONE } },
      take: 10,
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true } } }
    })

    return { pendingReviews, pendingComments }
  }

  private async getModeratorPerformance(moderatorId: string) {
    const moderatedReviews = await prisma.vote.findMany({
      where: {
        userId: moderatorId,
        review: { isNot: null }
      },
      select: { createdAt: true, review: { select: { createdAt: true } } }
    })

    const moderatedComments = await prisma.vote.findMany({
      where: {
        userId: moderatorId,
        comment: { isNot: null }
      },
      select: { createdAt: true, comment: { select: { createdAt: true } } }
    })

    const allModeratedItems = [
      ...moderatedReviews.map(r => ({ moderatedAt: r.createdAt, createdAt: r.review!.createdAt })),
      ...moderatedComments.map(c => ({ moderatedAt: c.createdAt, createdAt: c.comment!.createdAt }))
    ]

    const totalResponseTime = allModeratedItems.reduce((total, item) => {
      return total + (item.moderatedAt.getTime() - item.createdAt.getTime())
    }, 0)

    const averageResponseTime = allModeratedItems.length > 0
      ? totalResponseTime / allModeratedItems.length / (1000 * 60 * 60) // Convert to hours
      : 0

    return {
      totalModeratedItems: allModeratedItems.length,
      averageResponseTime
    }
  }
}
