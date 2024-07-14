import { faker } from '@faker-js/faker'
import { Review, UserCommentFlag, type Comment } from '@prisma/client'
import { generateIdFromEntropySize } from 'lucia'
import { weightedRandomDelete } from './utils.js'
import { prisma } from '#services/prisma_service'

const weightedRandomFlag = (): UserCommentFlag => {
//    // 80% chance of returning NONE
    if (Math.random() < 0.8) {
    return 'NONE'
    }
    else {
      return faker.helpers.arrayElement(Object.values(UserCommentFlag))
    }
    // 20% chance of returning INAPPROPRIATE_LANGUAGE
}

export const generateReviews = async (
  existingUserIds: string[],
  count: number
): Promise<Review[]> => {
  const generatedReviews: Review[] = []
  const existingRepoIds = await prisma.codeRepo.findMany({ select: { id: true } })

  for (let i = 0; i < count; i++) {
    const randomUserId = existingUserIds[Math.floor(Math.random() * existingUserIds.length)]
    const randomRating = faker.helpers.rangeToNumber({ min: 1, max: 5 })
    const randomFlag = weightedRandomFlag()

    const review: Review = {
      id: generateIdFromEntropySize(32),
      userId: randomUserId,
      repoId: existingRepoIds[Math.floor(Math.random() * existingRepoIds.length)].id,
      content: faker.lorem.paragraph(),
      rating: randomRating,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: weightedRandomDelete(),
      upvotes: faker.helpers.rangeToNumber({ min: 0, max: 100 }),
      downvotes: faker.helpers.rangeToNumber({ min: 0, max: 100 }),
      flag: randomFlag,
    }
    generatedReviews.push(review)
    console.log('Generated review:', review)
  }

  return generatedReviews
}

export const generateComments = async (
  existingUserIds: string[],
  existingReviewIds: string[],
  count: number
): Promise<Comment[]> => {
  const generatedComments: Comment[] = []

  for (let i = 0; i < count; i++) {
    const randomUserId = existingUserIds[Math.floor(Math.random() * existingUserIds.length)]
    const randomReviewId = existingReviewIds[Math.floor(Math.random() * existingReviewIds.length)]
    const randomFlag = weightedRandomFlag()

    const comment: Comment = {
      id: generateIdFromEntropySize(32),
      userId: randomUserId,
      reviewId: randomReviewId,
      content: faker.lorem.paragraph(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: weightedRandomDelete(),
      upvotes: faker.helpers.rangeToNumber({ min: 0, max: 100 }),
      downvotes: faker.helpers.rangeToNumber({ min: 0, max: 100 }),
      flag: randomFlag,
    }
    generatedComments.push(comment)
  }

  return generatedComments
}

export const seedReviewsAndComments = async (count: number): Promise<void> => {
  const existingUserIds = (await prisma.user.findMany({ select: { id: true } })).map((user) => user.id)
  const reviews = await generateReviews(existingUserIds, count)
  const reviewIds = reviews.map((review) => review.id)
  const comments = await generateComments(existingUserIds, reviewIds, count * 5)

  await prisma.review.createMany({ data: reviews })
  await prisma.comment.createMany({ data: comments })
}
