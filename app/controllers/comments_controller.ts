import type { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import { CommentService } from '#services/comment_service';
import { z } from 'zod';

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  userId: z.string().cuid(),
  reviewId: z.string().cuid(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const idParamSchema = z.object({
  id: z.string().cuid(),
});

@inject()
export default class CommentController {
  constructor(protected commentService: CommentService) {}

  public async create({ request, response }: HttpContext) {
    try {
      const data = createCommentSchema.parse(request.all());
      const comment = await this.commentService.createComment(data);
      return response.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  public async getById({ params, response }: HttpContext) {
    try {
      const { id } = idParamSchema.parse(params);
      const comment = await this.commentService.getCommentById(id);
      return response.status(200).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors });
      }
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  public async update({ params, request, response }: HttpContext) {
    try {
      const { id } = idParamSchema.parse(params);
      const data = updateCommentSchema.parse(request.all());
      const comment = await this.commentService.updateComment(id, data);
      return response.status(200).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  public async delete({ params, response }: HttpContext) {
    try {
      const { id } = idParamSchema.parse(params);
      const comment = await this.commentService.deleteComment(id);
      return response.status(200).json({ message: 'Comment deleted successfully', comment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors });
      }
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  public async getAll({ response }: HttpContext) {
    try {
      const comments = await this.commentService.getAllComments();
      return response.status(200).json(comments);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  public async upvote({ params, response }: HttpContext) {
    try {
      const { id } = idParamSchema.parse(params);
      const comment = await this.commentService.upvoteComment(id);
      return response.status(200).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors });
      }
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  public async downvote({ params, response }: HttpContext) {
    try {
      const { id } = idParamSchema.parse(params);
      const comment = await this.commentService.downvoteComment(id);
      return response.status(200).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({ message: 'Invalid ID', errors: error.errors });
      }
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }
}

