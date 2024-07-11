import { faker } from '@faker-js/faker'
import type { Comment } from '@prisma/client'
import { generateIdFromEntropySize } from 'lucia'
import { weightedRandomDelete } from './utils.js'

export const generateComments = async (
  existingUserIds: string[],
  existingReviewIds: string[],
  count: number
): Promise<Comment[]> => {
  const generatedComments: Comment[] = []

  for (let i = 0; i < count; i++) {
    const randomUserId = existingUserIds[Math.floor(Math.random() * existingUserIds.length)]
    const randomReviewId = existingReviewIds[Math.floor(Math.random() * existingReviewIds.length)]

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
      flag: 0,
    }
    generatedComments.push(comment)
  }

  return generatedComments
}
