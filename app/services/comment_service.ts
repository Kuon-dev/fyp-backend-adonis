import { prisma } from '#services/prisma_service'
import { Comment, UserCommentFlag } from '@prisma/client'
import {
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers
} from 'obscenity'

interface CommentCreationData {
  content: string
  userId: string
  reviewId: string
}

interface CommentUpdateData {
  content?: string
}

interface CommentResponse {
  id: string
  content: string
  userId: string
  reviewId: string
  createdAt: Date
  updatedAt: Date
  upvotes: number
  downvotes: number
}

export class CommentService {
  private matcher: RegExpMatcher
  private censor: TextCensor

  constructor() {
    // Initialize Obscenity matcher and censor
    this.matcher = new RegExpMatcher({
      ...englishDataset.build(),
      ...englishRecommendedTransformers
    })
    //this.censor = new TextCensor()
  }

  /**
   * Check content for inappropriate language using Obscenity
   * @param content - The content to check
   * @returns A UserCommentFlag based on the content analysis
   */
  private checkContent(content: string): UserCommentFlag {
    if (this.matcher.hasMatch(content)) {
      return 'INAPPROPRIATE_LANGUAGE'
    }
    return 'NONE'
  }

  /**
   * Censor inappropriate content in a string
   * @param content - The content to censor
   * @returns Censored content
   */

  /**
   * Remove sensitive data from a comment before sending to client
   * @param comment - The full comment object from the database
   * @returns A sanitized version of the comment
   */
  private sanitizeComment(comment: Comment): CommentResponse {
    const { id, content, userId, reviewId, createdAt, updatedAt, upvotes, downvotes } = comment
    return {
      id,
      content: (content),
      userId,
      reviewId,
      createdAt,
      updatedAt,
      upvotes,
      downvotes
    }
  }

  /**
   * Create a new comment
   * @param data - The data for the new comment
   * @returns A sanitized version of the created comment
   */
  async createComment(data: CommentCreationData): Promise<CommentResponse> {
    const flag = this.checkContent(data.content)

    const comment = await prisma.comment.create({
      data: {
        ...data,
        flag,
      },
    })

    return this.sanitizeComment(comment)
  }

  /**
   * Retrieve a comment by its ID
   * @param id - The ID of the comment to retrieve
   * @returns A sanitized version of the comment, or null if not found
   */
  async getCommentById(id: string): Promise<CommentResponse | null> {
    const comment = await prisma.comment.findUnique({ where: { id, deletedAt: null } })
    return comment ? this.sanitizeComment(comment) : null
  }

  /**
   * Update an existing comment
   * @param id - The ID of the comment to update
   * @param data - The new data for the comment
   * @returns A sanitized version of the updated comment
   */
  async updateComment(id: string, data: CommentUpdateData): Promise<CommentResponse> {
    const flag = data.content ? this.checkContent(data.content) : undefined

    const comment = await prisma.comment.update({
      where: { id, deletedAt: null },
      data: { ...data, flag },
    })

    return this.sanitizeComment(comment)
  }

  /**
   * Soft delete a comment
   * @param id - The ID of the comment to delete
   * @returns A sanitized version of the deleted comment
   */
  async deleteComment(id: string): Promise<CommentResponse> {
    const comment = await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return this.sanitizeComment(comment)
  }

  /**
   * Retrieve all non-deleted comments
   * @returns An array of sanitized comments
   */
  async getAllFlaggedComments(): Promise<CommentResponse[]> {
    const comments = await prisma.comment.findMany({
      where: {
        deletedAt: null,
        flag: { not: UserCommentFlag.NONE }
      }
    })
    return comments.map(comment => this.sanitizeComment(comment))
  }

  /**
   * Upvote a comment
   * @param id - The ID of the comment to upvote
   * @returns A sanitized version of the updated comment
   */
  async upvoteComment(id: string): Promise<CommentResponse> {
    const comment = await prisma.comment.update({
      where: { id, deletedAt: null },
      data: { upvotes: { increment: 1 } },
    })

    return this.sanitizeComment(comment)
  }

  /**
   * Downvote a comment
   * @param id - The ID of the comment to downvote
   * @returns A sanitized version of the updated comment
   */
  async downvoteComment(id: string): Promise<CommentResponse> {
    const comment = await prisma.comment.update({
      where: { id, deletedAt: null },
      data: { downvotes: { increment: 1 } },
    })

    return this.sanitizeComment(comment)
  }

  /**
   * Report a comment for moderation
   * @param id - The ID of the comment to report
   * @param reporterId - The ID of the user reporting the comment
   * @param reason - The reason for reporting the comment
   * @returns A sanitized version of the reported comment
   */
  //async reportComment(id: string, reporterId: string, reason: UserCommentFlag): Promise<CommentResponse> {
  //  const comment = await prisma.comment.update({
  //    where: { id, deletedAt: null },
  //    data: {
  //      flag: UserCommentFlag, // Set flag to indicate it needs review
  //      reports: {
  //        create: {
  //          reporterId,
  //          reason,
  //        },
  //      },
  //    },
  //  })
  //
  //  return this.sanitizeComment(comment)
  //}
}

