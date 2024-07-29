import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ReviewService } from '#services/review_service'
import { z } from 'zod'
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import { VoteType } from '@prisma/client'
import NotFoundException from '#exceptions/not_found_exception'

const createReviewSchema = z.object({
  content: z.string().min(1).max(1000),
  repoId: z.string(),
  rating: z.number().int().min(1).max(5),
})

const updateReviewSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
})

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(10),
})

//const voteSchema = z.object({
//  type: z.nativeEnum(VoteType),
//})

/**
 * Controller class for handling Review operations.
 */
@inject()
export default class ReviewController {
  constructor(protected reviewService: ReviewService) {}

  /**
   * @createReview
   * @description Create a new review for a repository.
   * @route POST /reviews
   * @param {HttpContext} ctx - The HTTP context object.
   * @requestBody {
   *   "content": "This is a great repository!",
   *   "repoId": "cuid1234567890",
   *   "rating": 5
   * }
   * @responseBody 201 - {
   *   "id": "cuid0987654321",
   *   "content": "This is a great repository!",
   *   "userId": "user123",
   *   "repoId": "cuid1234567890",
   *   "rating": 5,
   *   "createdAt": "2023-07-15T10:00:00Z",
   *   "updatedAt": "2023-07-15T10:00:00Z"
   * }
   * @responseBody 400 - { "message": "Validation error", "errors": [...] }
   * @responseBody 401 - { "message": "Unauthorized" }
   */
  public async create({ request, response }: HttpContext) {
    try {
      const userId = request.user?.id
      if (!userId) {
        throw new UnAuthorizedException('Unauthorized')
      }
      const data = createReviewSchema.parse(request.all())
      const review = await this.reviewService.createReview({ ...data, userId })
      return response.status(201).json(review)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @getReviewById
   * @description Retrieve a review by its ID.
   * @route GET /reviews/:id
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - {
   *   "id": "cuid0987654321",
   *   "content": "This is a great repository!",
   *   "userId": "user123",
   *   "repoId": "cuid1234567890",
   *   "rating": 5,
   *   "createdAt": "2023-07-15T10:00:00Z",
   *   "updatedAt": "2023-07-15T10:00:00Z",
   *   "upvotes": 10,
   *   "downvotes": 2
   * }
   * @responseBody 400 - { "message": "Invalid ID" }
   */
  public async getById({ params, response }: HttpContext) {
    try {
      const { id } = params
      const review = await this.reviewService.getReviewById(id)
      return response.status(200).json(review)
    } catch (error) {
      return response.status(400).json({ message: 'Invalid ID' })
    }
  }

  /**
   * @getPaginatedReviewsByRepo
   * @description Get paginated reviews for a specific repository.
   * @route GET /repo/:repoId/reviews
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam {number} page - Page number for pagination.
   * @queryParam {number} perPage - Number of items per page.
   * @responseBody 200 - { "data": [...], "meta": { ... } }
   * @responseBody 404 - { "message": "Repo not found" }
   * @responseBody 400 - { "message": "Validation error", "errors": [...] }
   */
  public async getPaginatedReviewsByRepo({ params, request, response }: HttpContext) {
    try {
      const { id } = params
      if (!id) throw new Error('Invalid repo ID')
      const { page, perPage } = paginationSchema.parse(request.qs())
      const reviews = await this.reviewService.getPaginatedReviewsByRepo(id, page, perPage)
      return response.status(200).json(reviews)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      if (error instanceof NotFoundException) {
        return response.status(404).json({ message: error.message })
      }
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @updateReview
   * @description Update a specific review.
   * @route PUT /reviews/:id
   * @param {HttpContext} ctx - The HTTP context object.
   * @requestBody {
   *   "content": "Updated review content",
   *   "rating": 4
   * }
   * @responseBody 200 - { ... }
   * @responseBody 400 - { "message": "Validation error", "errors": [...] }
   * @responseBody 401 - { "message": "Unauthorized" }
   * @responseBody 403 - { "message": "Forbidden" }
   * @responseBody 404 - { "message": "Review not found" }
   */
  public async update({ params, request, response }: HttpContext) {
    try {
      const userId = request.user?.id
      if (!userId) {
        throw new UnAuthorizedException('Unauthorized')
      }
      
      const { id } = params
      const data = updateReviewSchema.parse(request.all())
      const review = await this.reviewService.updateReview(id, userId, data)
      return response.status(200).json(review)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      if (error instanceof UnAuthorizedException) {
        return response.status(401).json({ message: error.message })
      }
      if (error instanceof NotFoundException) {
        return response.status(404).json({ message: error.message })
      }
      if (error.message === 'Forbidden') {
        return response.status(403).json({ message: 'You do not have permission to update this review' })
      }
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @revertReviewFlag
   * @description Revert the flag on a review to NONE.
   * @route PUT /reviews/:id/revert
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - {
   *   "id": "cuid0987654321",
   *   "content": "This is a review",
   *   "userId": "user123",
   *   "repoId": "cuid1234567890",
   *   "rating": 5,
   *   "createdAt": "2023-07-15T10:00:00Z",
   *   "updatedAt": "2023-07-15T11:00:00Z",
   *   "flag": "NONE",
   *   "upvotes": 10,
   *   "downvotes": 2
   * }
   * @responseBody 400 - { "message": "Invalid ID" }
   */
  public async revertFlag({ params, response }: HttpContext) {
    try {
      const { id } = params
      const review = await this.reviewService.revertFlag(id)
      return response.status(200).json(review)
    } catch (error) {
      return response.status(400).json({ message: 'Invalid ID' })
    }
  }

  /**
   * @deleteReview
   * @description Soft delete a specific review.
   * @route DELETE /reviews/:id
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - { "message": "Review deleted successfully", "review": {...} }
   * @responseBody 400 - { "message": "Invalid ID" }
   */
  public async delete({ params, response }: HttpContext) {
    try {
      const { id } = params
      const review = await this.reviewService.deleteReview(id)
      return response.status(200).json({ message: 'Review deleted successfully', review })
    } catch (error) {
      return response.status(400).json({ message: 'Invalid ID' })
    }
  }

  /**
   * @getAllFlaggedReviews
   * @description Get all flagged reviews.
   * @route GET /reviews/flagged
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - [
   *   {
   *     "id": "cuid0987654321",
   *     "content": "This is a flagged review",
   *     "userId": "user123",
   *     "repoId": "cuid1234567890",
   *     "rating": 5,
   *     "createdAt": "2023-07-15T10:00:00Z",
   *     "updatedAt": "2023-07-15T10:00:00Z",
   *     "flag": "INAPPROPRIATE_LANGUAGE"
   *   },
   *   ...
   * ]
   * @responseBody 400 - { "message": "Error message" }
   */
  public async getAll({ response }: HttpContext) {
    try {
      const reviews = await this.reviewService.getAllFlaggedReviews()
      return response.status(200).json(reviews)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @handleVote
   * @description Handle upvote or downvote for a review.
   * @route POST /reviews/:id/vote
   * @param {HttpContext} ctx - The HTTP context object.
   * @requestBody {
   *   "type": "UPVOTE" | "DOWNVOTE"
   * }
   * @responseBody 200 - {
   *   "id": "cuid0987654321",
   *   "content": "This is a review",
   *   "userId": "user123",
   *   "repoId": "cuid1234567890",
   *   "rating": 5,
   *   "createdAt": "2023-07-15T10:00:00Z",
   *   "updatedAt": "2023-07-15T11:00:00Z",
   *   "upvotes": 11,
   *   "downvotes": 2
   * }
   * @responseBody 400 - { "message": "Validation error", "errors": [...] }
   * @responseBody 401 - { "message": "Unauthorized" }
   */
  public async handleVote({ params, request, response }: HttpContext) {
    try {
      const { id, vote } = params
      const userId = request.user?.id
      if (!userId) {
        throw new UnAuthorizedException('Unauthorized')
      }
      const voteType = vote === 'upvote' ? VoteType.UPVOTE : VoteType.DOWNVOTE
      const review = await this.reviewService.handleVote(id, userId, voteType)
      return response.status(200).json(review)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      if (error instanceof UnAuthorizedException) {
        return response.status(401).json({ message: error.message })
      }
      return response.status(400).json({ message: error.message })
    }
  }
}
