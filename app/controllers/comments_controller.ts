import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { CommentService } from '#services/comment_service'
import { z } from 'zod'
import UnAuthorizedException from '#exceptions/un_authorized_exception'

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  reviewId: z.string(),
})

const updateCommentSchema = z.object({
  content: z.string().max(1000).optional(),
  flag: z.enum(['NONE']).optional(),
})

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(10),
  reviewId: z.string().cuid(),
})

@inject()
export default class CommentController {
  constructor(protected commentService: CommentService) {}

  public async create({ request, response }: HttpContext) {
    try {
      const userId = request.user?.id
      console.log(request.user)
      if (!userId) {
        throw new UnAuthorizedException('Unauthorized');
      }
      const data = request.all()
      const validatedData = createCommentSchema.parse(data)
      const comment = await this.commentService.createComment({
        ...validatedData,
        userId
      })
      return response.status(201).json(comment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  public async getCommentsByReview({ params, request, response }: HttpContext) {
    try {
      const { reviewId } = params
      const { page, perPage } =request.qs()
      const comments = await this.commentService.getPaginatedCommentsByReview(reviewId, parseInt(page), parseInt(perPage))
      return response.status(200).json(comments)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

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

  public async getAll({ response }: HttpContext) {
    try {
      const comments = await this.commentService.getAllFlaggedComments()
      return response.status(200).json(comments)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  public async upvote({ params, response }: HttpContext) {
    try {
      const { id } = params
      const comment = await this.commentService.upvoteComment(id)
      return response.status(200).json(comment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  public async downvote({ params, response }: HttpContext) {
    try {
      const { id } = params
      const comment = await this.commentService.downvoteComment(id)
      return response.status(200).json(comment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors })
      }
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }
}
