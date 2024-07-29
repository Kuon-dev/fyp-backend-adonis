import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { CommentService } from '#services/comment_service'
import { z } from 'zod'
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import { UserCommentFlag, VoteType } from '@prisma/client'

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  reviewId: z.string(),
})

type UserCommentFlagType = (typeof UserCommentFlag)[keyof typeof UserCommentFlag]

const updateCommentSchema = z.object({
  content: z.string().max(1000).optional(),
  flag: z
    .enum(Object.values(UserCommentFlag) as [UserCommentFlagType, ...UserCommentFlagType[]])
    .optional(),
})

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(10),
  //reviewId: z.string().cuid(),
})

const voteSchema = z.object({
  type: z.enum(['UPVOTE', 'DOWNVOTE']),
})

@inject()
export default class CommentController {
  constructor(protected commentService: CommentService) {}

  /**
   * @createComment
   * @description Create a new comment for a review.
   * @route POST /comments
   * @param {HttpContext} ctx - The HTTP context object.
   * @requestBody {
   *   "content": "This is a comment",
   *   "reviewId": "cuid1234567890"
   * }
   * @responseBody 201 - {
   *   "id": "cuid1234567890",
   *   "content": "This is a comment",
   *   "userId": "user123",
   *   "reviewId": "review456",
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
      const data = request.all()
      const validatedData = createCommentSchema.parse(data)
      const comment = await this.commentService.createComment({
        ...validatedData,
        userId,
      })
      return response.status(201).json(comment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @getCommentsByReview
   * @description Get paginated comments for a specific review.
   * @route GET /repo/:repoId/reviews/:reviewId
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam {number} page - Page number for pagination.
   * @queryParam {number} perPage - Number of items per page.
   * @responseBody 200 - {
   *   "data": [
   *     {
   *       "id": "cuid1234567890",
   *       "content": "This is a comment",
   *       "userId": "user123",
   *       "reviewId": "review456",
   *       "createdAt": "2023-07-15T10:00:00Z",
   *       "updatedAt": "2023-07-15T10:00:00Z",
   *       "upvotes": 5,
   *       "downvotes": 2
   *     },
   *     ...
   *   ],
   *   "meta": {
   *     "total": 100,
   *     "page": 1,
   *     "perPage": 10,
   *     "lastPage": 10
   *   }
   * }
   * @responseBody 400 - { "message": "Validation error", "errors": [...] }
   */
  public async getCommentsByReview({ params, request, response }: HttpContext) {
    try {
      const { reviewId } = params
      const { page, perPage } = paginationSchema.parse(request.qs())
      const comments = await this.commentService.getPaginatedCommentsByReview(
        reviewId,
        page,
        perPage
      )
      return response.status(200).json(comments)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @getCommentById
   * @description Get a specific comment by its ID.
   * @route GET /comments/:id
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - {
   *   "id": "cuid1234567890",
   *   "content": "This is a comment",
   *   "userId": "user123",
   *   "reviewId": "review456",
   *   "createdAt": "2023-07-15T10:00:00Z",
   *   "updatedAt": "2023-07-15T10:00:00Z",
   *   "upvotes": 5,
   *   "downvotes": 2
   * }
   * @responseBody 400 - { "message": "Invalid ID", "errors": [...] }
   */
  public async getById({ params, response }: HttpContext) {
    try {
      const { id } = params
      const comment = await this.commentService.getCommentById(id)
      return response.status(200).json(comment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @updateComment
   * @description Update a specific comment.
   * @route PUT /comments/:id
   * @param {HttpContext} ctx - The HTTP context object.
   * @requestBody {
   *   "content": "Updated comment content"
   * }
   * @responseBody 200 - {
   *   "id": "cuid1234567890",
   *   "content": "Updated comment content",
   *   "userId": "user123",
   *   "reviewId": "review456",
   *   "createdAt": "2023-07-15T10:00:00Z",
   *   "updatedAt": "2023-07-15T11:00:00Z",
   *   "upvotes": 5,
   *   "downvotes": 2
   * }
   * @responseBody 400 - { "message": "Validation error", "errors": [...] }
   */
  public async update({ params, request, response }: HttpContext) {
    try {
      const { id } = params
      const data = updateCommentSchema.parse(request.all())
      const comment = await this.commentService.updateComment(id, data)
      return response.status(200).json(comment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @revertCommentFlag
   * @description Revert the flag on a comment to NONE.
   * @route PUT /comments/:id/revert
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - {
   *   "id": "cuid1234567890",
   *   "content": "This is a comment",
   *   "userId": "user123",
   *   "reviewId": "review456",
   *   "createdAt": "2023-07-15T10:00:00Z",
   *   "updatedAt": "2023-07-15T11:00:00Z",
   *   "flag": "NONE",
   *   "upvotes": 5,
   *   "downvotes": 2
   * }
   * @responseBody 400 - { "message": "Invalid ID", "errors": [...] }
   */
  public async revertFlag({ params, response }: HttpContext) {
    try {
      const { id } = params
      const comment = await this.commentService.revertFlag(id)
      return response.status(200).json(comment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @deleteComment
   * @description Soft delete a specific comment.
   * @route DELETE /comments/:id
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - { "message": "Comment deleted successfully", "comment": {...} }
   * @responseBody 400 - { "message": "Invalid ID", "errors": [...] }
   */
  public async delete({ params, response }: HttpContext) {
    try {
      const { id } = params
      const comment = await this.commentService.deleteComment(id)
      return response.status(200).json({ message: 'Comment deleted successfully', comment })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @getAllFlaggedComments
   * @description Get all flagged comments.
   * @route GET /comments/flagged
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - [
   *   {
   *     "id": "cuid1234567890",
   *     "content": "This is a flagged comment",
   *     "userId": "user123",
   *     "reviewId": "review456",
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
      const comments = await this.commentService.getAllFlaggedComments()
      return response.status(200).json(comments)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @handleVote
   * @description Handle upvote or downvote for a comment.
   * @route POST /comments/:id/vote
   * @param {HttpContext} ctx - The HTTP context object.
   * @requestBody {
   *   "type": "UPVOTE" | "DOWNVOTE"
   * }
   * @responseBody 200 - {
   *   "id": "cuid1234567890",
   *   "content": "This is a comment",
   *   "userId": "user123",
   *   "reviewId": "review456",
   *   "createdAt": "2023-07-15T10:00:00Z",
   *   "updatedAt": "2023-07-15T11:00:00Z",
   *   "upvotes": 6,
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
      // process the types into the enum
      const voteType = vote === 'upvote' ? VoteType.UPVOTE : VoteType.DOWNVOTE

      const comment = await this.commentService.handleVote(id, userId, voteType)
      return response.status(200).json(comment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }
}
