import type { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import { CommentService } from '#services/comment_service';

/**
 * Controller class for handling Comment operations.
 */
@inject()
export default class CommentController {
  constructor(protected commentService: CommentService) {}

  /**
   * Create a new comment.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async create({ request, response }: HttpContext) {
    const data = request.only(['content', 'userId', 'reviewId']);

    try {
      const comment = await this.commentService.createComment(data);
      return response.status(201).json(comment);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve a comment by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the comment.
   */
  public async getById({ params, response }: HttpContext) {
    const { id } = params;

    try {
      const comment = await this.commentService.getCommentById(id);
      return response.status(200).json(comment);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Update a comment.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the comment.
   * @bodyParam data - The data to update the comment.
   */
  public async update({ params, request, response }: HttpContext) {
    const { id } = params;
    const data = request.only(['content']);

    try {
      const comment = await this.commentService.updateComment(id, data);
      return response.status(200).json(comment);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Soft delete a comment by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the comment.
   */
  public async delete({ params, response }: HttpContext) {
    const { id } = params;

    try {
      const comment = await this.commentService.deleteComment(id);
      return response.status(200).json({ message: 'Comment deleted successfully', comment });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve all comments.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async getAll({ response }: HttpContext) {
    try {
      const comments = await this.commentService.getAllComments();
      return response.status(200).json(comments);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Upvote a comment by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the comment.
   */
  public async upvote({ params, response }: HttpContext) {
    const { id } = params;

    try {
      const comment = await this.commentService.upvoteComment(id);
      return response.status(200).json(comment);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Downvote a comment by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the comment.
   */
  public async downvote({ params, response }: HttpContext) {
    const { id } = params;

    try {
      const comment = await this.commentService.downvoteComment(id);
      return response.status(200).json(comment);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }
}

