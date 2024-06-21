import { faker } from "@faker-js/faker";
import type {
  Review,
  // Repo,
  // User,
} from "@prisma/client";
import { generateIdFromEntropySize } from "lucia";
import { weightedRandomDelete } from "./utils.js";

export const generateReviews = async (
  existingUserIds: string[],
  existingRepoIds: string[],
  count: number,
): Promise<Review[]> => {
  const generatedReviews: Review[] = [];

  for (let i = 0; i < count; i++) {
    const randomUserId =
      existingUserIds[Math.floor(Math.random() * existingUserIds.length)];
    const randomRepoId =
      existingRepoIds[Math.floor(Math.random() * existingRepoIds.length)];

    const review: Review = {
      id: generateIdFromEntropySize(32),
      userId: randomUserId,
      repoId: randomRepoId,
      content: faker.lorem.paragraph(),
      rating: faker.helpers.rangeToNumber({ min: 1, max: 5 }),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: weightedRandomDelete(),
    };
    generatedReviews.push(review);
  }

  return generatedReviews;
};
