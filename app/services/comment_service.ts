import { prisma } from '#services/prisma_service';
import type { Comment } from '@prisma/client';

interface CommentCreationData {
  content: string;
  userId: string;
  reviewId: string;
}

interface CommentUpdateData {
  content?: string;
}

export class CommentService {
  private inappropriateWords: Set<string>;

  constructor() {
    this.inappropriateWords = new Set([
      'badword1',
      'badword2',
      'badword3',
      // Add more inappropriate words here
    ]);
  }

  /**
   * Check if the given content contains any inappropriate words.
   * @param content - The content to check.
   * @returns True if inappropriate words are found, otherwise false.
   */
  private containsInappropriateWords(content: string): boolean {
    const words = content.split(/\s+/).map(word => word.toLowerCase());
    return words.some(word => this.inappropriateWords.has(word));
  }

  /**
   * Create a new comment.
   * @param data - The data to create a comment.
   * @returns The created comment.
   */
  async createComment(data: CommentCreationData): Promise<Comment> {
    let flag = 0;

    if (this.containsInappropriateWords(data.content)) {
      flag = 2; // Flag for inappropriate words
    }

    return prisma.comment.create({
      data: {
        ...data,
        flag,
      },
    });
  }

  /**
   * Retrieve a comment by ID.
   * @param id - The ID of the comment to retrieve.
   * @returns The retrieved comment.
   */
  async getCommentById(id: string): Promise<Comment | null> {
    return prisma.comment.findUnique({ where: { id, deletedAt: null } });
  }

  /**
   * Update a comment by ID.
   * @param id - The ID of the comment to update.
   * @param data - The data to update the comment.
   * @returns The updated comment.
   */
  async updateComment(id: string, data: CommentUpdateData): Promise<Comment> {
    return prisma.comment.update({ where: { id, deletedAt: null }, data });
  }

  /**
   * Soft delete a comment by ID.
   * @param id - The ID of the comment to delete.
   * @returns The deleted comment.
   */
  async deleteComment(id: string): Promise<Comment> {
    return prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Retrieve all comments.
   * @returns All comments.
   */
  async getAllComments(): Promise<Comment[]> {
    return prisma.comment.findMany({ where: { deletedAt: null } });
  }

  /**
   * Upvote a comment by ID.
   * @param id - The ID of the comment to upvote.
   * @returns The updated comment.
   */
  async upvoteComment(id: string): Promise<Comment> {
    return prisma.comment.update({
      where: { id, deletedAt: null },
      data: { upvotes: { increment: 1 } },
    });
  }

  /**
   * Downvote a comment by ID.
   * @param id - The ID of the comment to downvote.
   * @returns The updated comment.
   */
  async downvoteComment(id: string): Promise<Comment> {
    return prisma.comment.update({
      where: { id, deletedAt: null },
      data: { downvotes: { increment: 1 } },
    });
  }
}
