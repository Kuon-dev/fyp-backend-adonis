import { prisma } from '#services/prisma_service'
import type { Review, Vote, VoteType } from '@prisma/client'
import logger from '@adonisjs/core/services/logger'
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import RepoAccessService from './repo_access_service.js'
import { inject } from '@adonisjs/core'
import NotFoundException from '#exceptions/not_found_exception'

interface ReviewCreationData {
  content: string
  userId: string
  repoId: string
  rating: number
}

interface ReviewUpdateData {
  content?: string
  rating?: number
}

@inject()
export class ReviewService {
  constructor(protected repoAccessService: RepoAccessService) {}
  /**
   * Create a new review.
   * @param data - The data to create a review.
   * @returns The created review.
   */
  async createReview(data: ReviewCreationData): Promise<Review> {
    const hasAccess = await prisma.$transaction(async (tx) => {
      return this.repoAccessService.hasAccess(data.userId, data.repoId, tx)
    })

    if (!hasAccess) {
      throw new UnAuthorizedException('User does not have access to this repo')
    }

    return prisma.review.create({
      data,
    })
  }

  async getPaginatedReviewsByRepo(
    repoId: string,
    page: number,
    perPage: number
  ): Promise<{
    data: (Review & { commentCount: number })[]
    meta: {
      total: number
      page: number
      perPage: number
      lastPage: number
    }
  }> {
    const repo = await prisma.codeRepo.findUnique({
      where: { id: repoId },
    })

    if (!repo) {
      throw new NotFoundException('Repo not found')
    }

    const reviews = await prisma.review.findMany({
      where: { repoId, deletedAt: null },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name: true,
                profileImg: true,
              },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    })

    const reviewsWithCommentCount = reviews.map((review) => ({
      ...review,
      commentCount: review._count.comments,
    }))

    const total = await prisma.review.count({
      where: { repoId, deletedAt: null },
    })

    return {
      data: reviewsWithCommentCount,
      meta: {
        total,
        page,
        perPage,
        lastPage: Math.ceil(total / perPage),
      },
    }
  }

  /**
   * Retrieve a review by ID.
   * @param id - The ID of the review to retrieve.
   * @returns The retrieved review.
   */
  async getReviewById(id: string): Promise<Review | null> {
    return prisma.review.findUnique({ where: { id, deletedAt: null } })
  }

  /**
   * Update a review by ID.
   * @param id - The ID of the review to update.
   * @param userId - The ID of the user attempting to update the review.
   * @param data - The data to update the review.
   * @returns The updated review.
   * @throws NotFoundException if the review is not found.
   * @throws UnAuthorizedException if the user is not the owner of the review.
   */
  async updateReview(id: string, userId: string, data: ReviewUpdateData): Promise<Review> {
    const review = await prisma.review.findUnique({ where: { id, deletedAt: null } })

    if (!review) {
      throw new NotFoundException('Review not found')
    }

    if (review.userId !== userId) {
      throw new Error('Forbidden')
    }

    return prisma.review.update({ where: { id }, data })
  }

  /**
   * Soft delete a review by ID.
   * @param id - The ID of the review to delete.
   * @returns The deleted review.
   */
  async deleteReview(id: string): Promise<Review> {
    return prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  /**
   * Retrieve all flagged reviews.
   * @returns All flagged reviews.
   */
  async getAllFlaggedReviews(): Promise<Review[]> {
    const reviews = await prisma.review.findMany({
      where: { deletedAt: null, flag: { not: 'NONE' } },
      include: { user: true },
    })

    return reviews.map((r) => ({
      ...r,
      user: {
        email: r.user.email,
      },
    }))
  }

  async revertFlag(id: string): Promise<Review> {
    return prisma.review.update({
      where: { id },
      data: { flag: 'NONE' },
    })
  }

  /**
   * Handle voting on a review.
   * @param reviewId - The ID of the review to vote on.
   * @param userId - The ID of the user voting.
   * @param voteType - The type of vote (UPVOTE or DOWNVOTE).
   * @returns The updated review.
   */
  async handleVote(reviewId: string, userId: string, voteType: VoteType): Promise<Review> {
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_reviewId: {
          userId,
          reviewId,
        },
      },
    })

    return prisma.$transaction(async (tx) => {
      if (!existingVote) {
        await tx.vote.create({
          data: {
            userId,
            reviewId,
            type: voteType,
          },
        })
        return tx.review.update({
          where: { id: reviewId },
          data: {
            [voteType === 'UPVOTE' ? 'upvotes' : 'downvotes']: { increment: 1 },
          },
        })
      } else if (existingVote.type !== voteType) {
        await tx.vote.update({
          where: { id: existingVote.id },
          data: { type: voteType },
        })
        return tx.review.update({
          where: { id: reviewId },
          data: {
            [voteType === 'UPVOTE' ? 'upvotes' : 'downvotes']: { increment: 1 },
            [voteType === 'UPVOTE' ? 'downvotes' : 'upvotes']: { decrement: 1 },
          },
        })
      } else {
        await tx.vote.delete({
          where: { id: existingVote.id },
        })
        return tx.review.update({
          where: { id: reviewId },
          data: {
            [voteType === 'UPVOTE' ? 'upvotes' : 'downvotes']: { decrement: 1 },
          },
        })
      }
    })
  }
}
