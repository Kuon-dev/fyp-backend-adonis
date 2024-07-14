// File: services/ReviewService.ts

import { prisma } from '#services/prisma_service'
import type { Review } from '@prisma/client'

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

export class ReviewService {
  /**
   * Create a new review.
   * @param data - The data to create a review.
   * @returns The created review.
   */
  async createReview(data: ReviewCreationData): Promise<Review> {
    return prisma.review.create({
      data,
    })
  }

  async getPaginatedReviewsByRepo(repoId: string, page: number, perPage: number): Promise<{
    data: Review[]
    meta: {
      total: number
      page: number
      perPage: number
      lastPage: number
    }
  }> {
    const reviews = await prisma.review.findMany({
      where: { repoId },
      skip: (page - 1) * perPage,
      take: perPage,
    })

    const total = await prisma.review.count({
      where: { repoId },
    })
    return {
      data: reviews,
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
   * @param data - The data to update the review.
   * @returns The updated review.
   */
  async updateReview(id: string, data: ReviewUpdateData): Promise<Review> {
    return prisma.review.update({ where: { id, deletedAt: null }, data })
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
   * Retrieve all reviews.
   * @returns All reviews.
   */
  async getAllReviews(): Promise<Review[]> {
    const reviews = await prisma.review.findMany({
      where: { deletedAt: null, flag: { not: "NONE" } },
      include: { user: true },
    })
    // only return suer id
    return reviews.map((r) => {
      return {
        ...r,
        user: {
          email:r.user.email,
        },
      }
    })
  }

  /**
   * Upvote a review by ID.
   * @param id - The ID of the review to upvote.
   * @returns The updated review.
   */
  async upvoteReview(id: string): Promise<Review> {
    return prisma.review.update({
      where: { id, deletedAt: null },
      data: { upvotes: { increment: 1 } },
    })
  }

  async revertFlag(id: string): Promise<Review> {
    return prisma.review.update({
      where: { id },
      data: { flag: 'NONE' },
    })
  }


  /**
   * Downvote a review by ID.
   * @param id - The ID of the review to downvote.
   * @returns The updated review.
   */
  async downvoteReview(id: string): Promise<Review> {
    return prisma.review.update({
      where: { id, deletedAt: null },
      data: { downvotes: { increment: 1 } },
    })
  }
}
