import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ReviewService } from '#services/review_service'
import { z } from 'zod'



/**
 * Controller class for handling Review operations.
 */
@inject()
export default class ReviewController {
  constructor(protected reviewService: ReviewService) {}

  /**
   * Create a new review.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async create({ request, response }: HttpContext) {
    const data = request.only(['content', 'userId', 'repoId', 'rating'])

    try {
      const review = await this.reviewService.createReview(data)
      return response.status(201).json(review)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * Retrieve a review by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the review.
   */
  public async getById({ params, response }: HttpContext) {
    const { id } = params

    try {
      const review = await this.reviewService.getReviewById(id)
      return response.status(200).json(review)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  public async getPaginatedReviewsByRepo({ params, request, response }: HttpContext) {
    const { repoId } = params
    const { page, perPage } = request.qs()
    try {
      const reviews = await this.reviewService.getPaginatedReviewsByRepo( repoId ,parseInt(page), parseInt(perPage))
      return response.status(200).json(reviews)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * Update a review.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the review.
   * @bodyParam data - The data to update the review.
   */
  public async update({ params, request, response }: HttpContext) {
    const { id } = params
    const data = request.only(['content', 'rating'])

    try {
      const review = await this.reviewService.updateReview(id, data)
      return response.status(200).json(review)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  public async revertFlag({ params, response }: HttpContext) {
    const { id } = params
    try {
      const review = await this.reviewService.revertFlag(id)
      return response.status(200).json(review)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * Soft delete a review by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the review.
   */
  public async delete({ params, response }: HttpContext) {
    const { id } = params

    try {
      const review = await this.reviewService.deleteReview(id)
      return response.status(200).json({ message: 'Review deleted successfully', review })
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * Retrieve all reviews.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async getAll({ response }: HttpContext) {
    try {
      const reviews = await this.reviewService.getAllReviews()
      return response.status(200).json(reviews)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * Upvote a review by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the review.
   */
  public async upvote({ params, response }: HttpContext) {
    const { id } = params

    try {
      const review = await this.reviewService.upvoteReview(id)
      return response.status(200).json(review)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * Downvote a review by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the review.
   */
  public async downvote({ params, response }: HttpContext) {
    const { id } = params

    try {
      const review = await this.reviewService.downvoteReview(id)
      return response.status(200).json(review)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }
}
