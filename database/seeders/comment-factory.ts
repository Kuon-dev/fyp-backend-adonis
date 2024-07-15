import { faker } from '@faker-js/faker'
import { Review, UserCommentFlag, type Comment, VoteType } from '@prisma/client'
import { generateIdFromEntropySize } from 'lucia'
import { weightedRandomDelete } from './utils.js'
import { prisma } from '#services/prisma_service'

const weightedRandomFlag = (): UserCommentFlag => {
  if (Math.random() < 0.8) {
    return 'NONE'
  } else {
    return faker.helpers.arrayElement(
      Object.values(UserCommentFlag).filter((flag) => flag !== 'NONE')
    )
  }
}

const generateVotes = (
  userIds: string[],
  itemId: string,
  itemType: 'review' | 'comment'
): {
  votes: { userId: string; type: VoteType }[]
  upvotes: number
  downvotes: number
} => {
  const votes: { userId: string; type: VoteType }[] = []
  let upvotes = 0
  let downvotes = 0

  // Randomly select users to vote (50% chance for each user)
  userIds.forEach((userId) => {
    if (Math.random() < 0.5) {
      const voteType = Math.random() < 0.6 ? VoteType.UPVOTE : VoteType.DOWNVOTE
      votes.push({
        userId,
        type: voteType,
      })
      voteType === VoteType.UPVOTE ? upvotes++ : downvotes++
    }
  })

  return { votes, upvotes, downvotes }
}

export const generateReviews = async (
  existingUserIds: string[],
  count: number
): Promise<{ reviews: Review[]; votes: any[] }> => {
  const generatedReviews: Review[] = []
  const generatedVotes: any[] = []
  const existingRepoIds = await prisma.codeRepo.findMany({ select: { id: true } })

  for (let i = 0; i < count; i++) {
    const randomUserId = faker.helpers.arrayElement(existingUserIds)
    const randomRating = faker.number.int({ min: 1, max: 5 })
    const randomFlag = weightedRandomFlag()
    const reviewId = generateIdFromEntropySize(32)

    const { votes, upvotes, downvotes } = generateVotes(existingUserIds, reviewId, 'review')

    const review: Review = {
      id: reviewId,
      userId: randomUserId,
      repoId: faker.helpers.arrayElement(existingRepoIds).id,
      content: faker.lorem.paragraph(),
      rating: randomRating,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      deletedAt: weightedRandomDelete(),
      upvotes,
      downvotes,
      flag: randomFlag,
    }

    generatedReviews.push(review)
    generatedVotes.push(
      ...votes.map((vote) => ({
        id: generateIdFromEntropySize(32),
        reviewId,
        ...vote,
      }))
    )
  }

  return { reviews: generatedReviews, votes: generatedVotes }
}

export const generateComments = async (
  existingUserIds: string[],
  existingReviewIds: string[],
  count: number
): Promise<{ comments: Comment[]; votes: any[] }> => {
  const generatedComments: Comment[] = []
  const generatedVotes: any[] = []

  for (let i = 0; i < count; i++) {
    const randomUserId = faker.helpers.arrayElement(existingUserIds)
    const randomReviewId = faker.helpers.arrayElement(existingReviewIds)
    const randomFlag = weightedRandomFlag()
    const commentId = generateIdFromEntropySize(32)

    const { votes, upvotes, downvotes } = generateVotes(existingUserIds, commentId, 'comment')

    const comment: Comment = {
      id: commentId,
      userId: randomUserId,
      reviewId: randomReviewId,
      content: faker.lorem.paragraph(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      deletedAt: weightedRandomDelete(),
      upvotes,
      downvotes,
      flag: randomFlag,
    }

    generatedComments.push(comment)
    generatedVotes.push(
      ...votes.map((vote) => ({
        id: generateIdFromEntropySize(32),
        commentId,
        ...vote,
      }))
    )
  }

  return { comments: generatedComments, votes: generatedVotes }
}

export const seedReviewsAndComments = async (count: number): Promise<void> => {
  const existingUserIds = (await prisma.user.findMany({ select: { id: true } })).map(
    (user) => user.id
  )
  const { reviews, votes: reviewVotes } = await generateReviews(existingUserIds, count)
  const reviewIds = reviews.map((review) => review.id)
  const { comments, votes: commentVotes } = await generateComments(
    existingUserIds,
    reviewIds,
    count * 5
  )

  await prisma.$transaction([
    prisma.review.createMany({ data: reviews }),
    prisma.comment.createMany({ data: comments }),
    prisma.vote.createMany({
      data: reviewVotes.map((vote) => ({
        commentId: vote.commentId,
        id: vote.id,
        reviewId: vote.reviewId,
        userId: vote.userId,
        type: vote.type,
      })),
    }),
    prisma.vote.createMany({
      data: commentVotes.map((vote) => ({
        id: vote.id,
        commentId: vote.commentId,
        userId: vote.userId,
        type: vote.type,
      })),
    }),
  ])
}
