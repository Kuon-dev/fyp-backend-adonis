import { faker } from '@faker-js/faker';
import { generateIdFromEntropySize } from 'lucia';
import type { CodeRepo, User, Tag, Profile } from '@prisma/client';
import { prisma } from '#services/prisma_service';
import { generateDates, randomBoolean } from './utils.js';
import {
  REPO_TAGS,
  PROJECT_MANAGEMENT,
  PROJECT_MANAGEMENT_CSS,
  KANBAN,
  KANBAN_CSS,
  QUIZ_APP,
  QUIZ_APP_CSS,
} from './constants.js';

// Function to generate a unique name
function generateUniqueName(user: User & { profile: Profile | null }, existingNames: Set<string>, retryCount: number = 0): string {
  const baseName = `${user.profile?.name || user.email.split('@')[0]}_${faker.company.name()}`;
  let name = retryCount === 0 ? baseName : `${baseName}_${retryCount}`;
  name = name.replace(/\s+/g, '_').toLowerCase();

  if (existingNames.has(name)) {
    return generateUniqueName(user, existingNames, retryCount + 1);
  }

  existingNames.add(name);
  return name;
}

async function generateCodeRepos(count: number = 10) {
  const codeRepos: { repo: Omit<CodeRepo, 'id'>; tags: string[] }[] = [];
  const users = await prisma.user.findMany({
    include: { profile: true },
  });
  const existingNames = new Set<string>();

  // Fetch all existing repo names from the database and add them to the Set
  const dbNames = await prisma.codeRepo.findMany({ select: { name: true } });
  dbNames.forEach(r => existingNames.add(r.name));

  for (let i = 0; i < count; i++) {
    const user = faker.helpers.arrayElement(users);
    const selectedRepo = faker.helpers.arrayElement([PROJECT_MANAGEMENT, KANBAN, QUIZ_APP]);
    const selectedRepoCss = {
      [PROJECT_MANAGEMENT]: PROJECT_MANAGEMENT_CSS,
      [KANBAN]: KANBAN_CSS,
      [QUIZ_APP]: QUIZ_APP_CSS,
    };

    const priceAmount = Math.floor(parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 })));
    const { createdAt, updatedAt, deletedAt } = generateDates();

    const codeRepo: Omit<CodeRepo, 'id'> = {
      userId: user.id,
      sourceJs: selectedRepo,
      sourceCss: selectedRepoCss[selectedRepo as keyof typeof selectedRepoCss],
      createdAt,
      updatedAt,
      deletedAt,
      visibility: randomBoolean() ? 'public' : 'private',
      status: faker.helpers.arrayElement(['pending', 'active', 'rejected']),
      name: generateUniqueName(user, existingNames),
      description: faker.lorem.sentences(),
      language: faker.helpers.arrayElement(['JSX', 'TSX']),
      price: priceAmount,
    };

    codeRepos.push({
      repo: codeRepo,
      tags: faker.helpers.arrayElements(REPO_TAGS, faker.number.int({ min: 1, max: 8 })),
    });
  }

  return codeRepos;
}

export async function seedCodeRepos(count: number = 50) {
  try {
    const codeReposWithTags = await generateCodeRepos(count);

    await prisma.$transaction(async (tx) => {
      for (const { repo, tags } of codeReposWithTags) {
        const createdRepo = await tx.codeRepo.create({
          data: {
            ...repo,
            id: generateIdFromEntropySize(32),
            tags: {
              create: tags.map((tagName) => ({
                name: tagName,
              })),
            },
          },
        });
        console.log(`Created code repo: ${createdRepo.name} with ${tags.length} tags`);
      }
    });

    console.log(`Successfully seeded ${count} code repos`);
  } catch (error) {
    console.error('Error seeding code repos:', error);
  } finally {
    await prisma.$disconnect();
  }
}
