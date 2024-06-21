import { faker } from "@faker-js/faker";
import { hash } from "@node-rs/argon2";
import type { User, Profile, Role } from "@prisma/client";
import { generateIdFromEntropySize } from "lucia";
import { generateDates, randomBoolean } from "./utils.js";

/**
 * Generates a list of fake users and their profiles.
 *
 * @param {number} [count=10] - The number of users to generate.
 * @returns {Promise<{users: User[], profiles: Profile[]}>} - An object containing arrays of generated users and profiles.
 */
export const generateUsers = async (count: number = 10): Promise<{ users: User[], profiles: Profile[] }> => {
  const users: User[] = [];
  const profiles: Profile[] = [];

  for (let i = 0; i < count; i++) {
    const passwordHash = await hash("password", {
      // recommended minimum parameters
      memoryCost: 19456,
      timeCost: 3,
      parallelism: 1,
      outputLen: 64,
    });

    const userRole: Role = faker.helpers.arrayElement(["USER", "SELLER", "ADMIN", "MODERATOR"]);
    const { createdAt, updatedAt, deletedAt } = generateDates();

    const user: User = {
      createdAt,
      updatedAt,
      deletedAt,
      email: faker.internet.email(),
      passwordHash: passwordHash,
      id: generateIdFromEntropySize(32),
      emailVerified: randomBoolean(),
      bannedUntil: null,
      isSellerVerified: randomBoolean(),
      role: userRole,
    };

    const profile: Profile = {
      id: generateIdFromEntropySize(32),
      userId: user.id,
      name: faker.person.firstName(),
      phoneNumber: faker.phone.number(),
      profileImg: null,
    };

    users.push(user);
    profiles.push(profile);
  }

  return {
    users,
    profiles,
  };
};
