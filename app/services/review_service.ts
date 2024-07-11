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
    return prisma.review.findMany({ where: { deletedAt: null } })
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
