import { faker } from "@faker-js/faker";
import { generateIdFromEntropySize } from "lucia";
import type { CodeRepo, User, Tag } from "@prisma/client";
import { prisma } from "#services/prisma_service";
import { generateDates, randomBoolean, weightedRandomDelete } from "./utils.js";
import { REPO_TAGS, TYPESCRIPT_VARIANT_1, TYPESCRIPT_VARIANT_2, TYPESCRIPT_VARIANT_3, TYPESCRIPT_VARIANT_4, TYPESCRIPT_VARIANT_5 } from "./constants.js";

async function generateCodeRepos(count: number = 10) {
  const codeRepos: {repo: CodeRepo, tags: string[]}[] = [];

  const users: User[] = await prisma.user.findMany();

  for (let i = 0; i < count; i++) {
    const userId = faker.helpers.arrayElement(users).id;
    const priceAmount = Math.floor(parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 })));
    const { createdAt, updatedAt, deletedAt } = generateDates();

    const codeRepo: CodeRepo = {
      id: generateIdFromEntropySize(32),
      userId: userId,
      sourceJs: faker.helpers.arrayElement([
        TYPESCRIPT_VARIANT_1,
        TYPESCRIPT_VARIANT_2,
        TYPESCRIPT_VARIANT_3,
        TYPESCRIPT_VARIANT_4,
        TYPESCRIPT_VARIANT_5,
      ]),
      sourceCss: "/* CSS */",
      createdAt,
      updatedAt,
      deletedAt,
      visibility: randomBoolean() ? "public" : "private",
      status: faker.helpers.arrayElement(["pending", "active", "rejected"]),
      name: faker.company.name(),
      description: faker.lorem.sentences(),
      language: faker.helpers.arrayElement(["JSX", "TSX"]),
      price: priceAmount,
    };

    codeRepos.push({
      repo: codeRepo,
      tags: faker.helpers.arrayElements(REPO_TAGS, faker.number.int({ min: 1, max: 8 })),
    });

    console.log('Generated code repo:', codeRepo.name);
  }

  return codeRepos;
}

export async function seedCodeRepos(count: number = 50) {
  try {
    const codeReposWithTags = await generateCodeRepos(count);

    for (const { repo, tags } of codeReposWithTags) {
      const createdRepo = await prisma.codeRepo.create({
        data: {
          ...repo,
          tags: {
            create: tags.map(tagName => ({
              name: tagName
            }))
          }
        },
      });

      console.log(`Created code repo: ${createdRepo.name} with ${tags.length} tags`);
    }

    console.log('Finished seeding code repos');
  } catch (error) {
    console.error('Error seeding code repos:', error);
  } finally {
    await prisma.$disconnect();
  }
}
