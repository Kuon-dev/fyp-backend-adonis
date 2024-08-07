import NotFoundException from '#exceptions/not_found_exception'
import { prisma } from '#services/prisma_service'
import { Comment, UserCommentFlag, VoteType } from '@prisma/client'
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'

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
  createdAt?: Date
  updatedAt?: Date
  upvotes?: number
  downvotes?: number
  flag: UserCommentFlag
}

export class CommentService {
  private matcher: RegExpMatcher

  constructor() {
    this.matcher = new RegExpMatcher({
      ...englishDataset.build(),
      ...englishRecommendedTransformers,
    })
  }

  private checkContent(content: string): UserCommentFlag {
    return this.matcher.hasMatch(content) ? 'INAPPROPRIATE_LANGUAGE' : 'NONE'
  }

  private sanitizeComment(comment: Comment): CommentResponse {
    const { id, content, userId, reviewId, createdAt, updatedAt, upvotes, downvotes, flag } =
      comment
    return { id, content, userId, reviewId, createdAt, updatedAt, upvotes, downvotes, flag }
  }

  async createComment(data: CommentCreationData): Promise<CommentResponse> {
    const flag = this.checkContent(data.content)
    const comment = await prisma.comment.create({ data: { ...data, flag } })
    return this.sanitizeComment(comment)
  }

  async getCommentById(id: string): Promise<CommentResponse | null> {
    const comment = await prisma.comment.findUnique({ where: { id, deletedAt: null } })
    return comment ? this.sanitizeComment(comment) : null
  }

  async updateComment(id: string, userId: string, content: string): Promise<Comment> {
    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) {
      throw new NotFoundException('Comment not found')
    }
    if (comment.userId !== userId) {
      throw new Error('You do not have permission to update this comment')
    }
    return prisma.comment.update({
      where: { id },
      data: { content },
    })
  }

  async revertFlag(id: string, userId: string): Promise<Comment> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin rights required')
    }
    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) {
      throw new NotFoundException('Comment not found')
    }
    return prisma.comment.update({
      where: { id },
      data: { flag: 'NONE' },
    })
  }

  async flagComment(id: string, userId: string, flag: UserCommentFlag): Promise<Comment> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin rights required')
    }
    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) {
      throw new NotFoundException('Comment not found')
    }
    return prisma.comment.update({
      where: { id },
      data: { flag },
    })
  }

  async deleteComment(id: string): Promise<CommentResponse> {
    const comment = await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return this.sanitizeComment(comment)
  }

  async getAllFlaggedComments(): Promise<
    Omit<CommentResponse, 'upvotes' | 'downvotes' | 'createdAt'>[]
  > {
    const comments = await prisma.comment.findMany({
      where: {
        flag: { not: UserCommentFlag.NONE },
      },
      include: { user: true },
    })

    return comments.map(({ upvotes, downvotes, createdAt, ...rest }) => {
      return {
        ...rest,
        user: {
          email: rest.user.email,
        },
      }
    })
  }

  async handleVote(
    commentId: string,
    userId: string,
    voteType: VoteType
  ): Promise<CommentResponse> {
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    })

    await prisma.$transaction(async (tx) => {
      if (!existingVote) {
        await tx.vote.create({
          data: {
            userId,
            commentId,
            type: voteType,
          },
        })
        await tx.comment.update({
          where: { id: commentId },
          data: {
            [voteType === VoteType.UPVOTE ? 'upvotes' : 'downvotes']: { increment: 1 },
          },
        })
      } else if (existingVote.type !== voteType) {
        await tx.vote.update({
          where: { id: existingVote.id },
          data: { type: voteType },
        })
        await tx.comment.update({
          where: { id: commentId },
          data: {
            [voteType === VoteType.UPVOTE ? 'upvotes' : 'downvotes']: { increment: 1 },
            [voteType === VoteType.UPVOTE ? 'downvotes' : 'upvotes']: { decrement: 1 },
          },
        })
      } else {
        await tx.vote.delete({
          where: { id: existingVote.id },
        })
        await tx.comment.update({
          where: { id: commentId },
          data: {
            [voteType === VoteType.UPVOTE ? 'upvotes' : 'downvotes']: { decrement: 1 },
          },
        })
      }
    })

    const updatedComment = await prisma.comment.findUnique({
      where: { id: commentId },
    })

    if (!updatedComment) {
      throw new Error('Comment not found after vote operation')
    }

    return this.sanitizeComment(updatedComment)
  }

  async getPaginatedCommentsByReview(reviewId: string, page: number, perPage: number) {
    const skip = (page - 1) * perPage
    const [comments, total] = await prisma.$transaction([
      prisma.comment.findMany({
        where: { reviewId },
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  name: true,
                  profileImg: true,
                },
              },
            },
          },
        },
      }),
      prisma.comment.count({ where: { reviewId } }),
    ])

    return {
      data: comments,
      meta: {
        total,
        page,
        perPage,
        lastPage: Math.ceil(total / perPage),
      },
    }
  }
}
