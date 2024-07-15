import { faker } from '@faker-js/faker'
import { generateIdFromEntropySize } from 'lucia'
import type { CodeRepo, User, Tag, Profile } from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { generateDates, randomBoolean } from './utils.js'
import {
  REPO_TAGS,
  PROJECT_MANAGEMENT,
  PROJECT_MANAGEMENT_CSS,
  KANBAN,
  KANBAN_CSS,
  QUIZ_APP,
  QUIZ_APP_CSS,
} from './constants.js'

// Function to generate a unique name
function generateUniqueName(
  user: User & { profile: Profile | null },
  existingNames: Set<string>
): string {
  const maxAttempts = 100
  let attempt = 0

  while (attempt < maxAttempts) {
    const userName = user.profile?.name || user.email.split('@')[0]
    const companyName = faker.company.name()
    let name = `${userName}_${companyName}`.replace(/\s+/g, '_').toLowerCase()

    if (!existingNames.has(name)) {
      existingNames.add(name)
      return name
    }

    attempt++
  }

  throw new Error('Unable to generate a unique name after maximum attempts')
}

async function generateCodeRepos(count: number = 10) {
  const codeRepos: { repo: Omit<CodeRepo, 'id'>; tags: string[] }[] = []
  const users = await prisma.user.findMany({
    include: { profile: true },
  })

  if (users.length === 0) {
    throw new Error('No users found in the database. Please seed users first.')
  }

  const existingNames = new Set<string>()
  const dbNames = await prisma.codeRepo.findMany({ select: { name: true } })
  dbNames.forEach((r) => existingNames.add(r.name))

  for (let i = 0; i < count; i++) {
    try {
      const user = faker.helpers.arrayElement(users)
      const selectedRepo = faker.helpers.arrayElement([PROJECT_MANAGEMENT, KANBAN, QUIZ_APP])
      const selectedRepoCss = {
        [PROJECT_MANAGEMENT]: PROJECT_MANAGEMENT_CSS,
        [KANBAN]: KANBAN_CSS,
        [QUIZ_APP]: QUIZ_APP_CSS,
      }

      const priceAmount = Math.floor(
        parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 }))
      )
      const { createdAt, updatedAt, deletedAt } = generateDates()

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
      }

      codeRepos.push({
        repo: codeRepo,
        tags: faker.helpers.arrayElements(REPO_TAGS, faker.number.int({ min: 1, max: 8 })),
      })
    } catch (error) {
      console.error('Error generating code repo:', error)
    }
  }

  return codeRepos
}

export async function seedCodeRepos(count: number = 50) {
  let successfullyCreated = 0
  const errors: Error[] = []

  try {
    const codeReposWithTags = await generateCodeRepos(count)

    for (const { repo, tags } of codeReposWithTags) {
      try {
        await prisma.$transaction(async (tx) => {
          const createdRepo = await tx.codeRepo.create({
            data: {
              ...repo,
              id: generateIdFromEntropySize(32),
              tags: {
                create: tags.map((tagName) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name: tagName },
                      create: { name: tagName },
                    },
                  },
                })),
              },
            },
          })
          console.log(`Created code repo: ${createdRepo.name} with ${tags.length} tags`)
          successfullyCreated++
        })
      } catch (error) {
        console.error(`Error creating repo ${repo.name}:`, error)
        errors.push(error)
      }
    }

    console.log(`Successfully seeded ${successfullyCreated} out of ${count} requested code repos`)
    if (errors.length > 0) {
      console.log(`Encountered ${errors.length} errors during seeding`)
    }
  } catch (error) {
    console.error('Error generating code repos:', error)
  } finally {
    await prisma.$disconnect()
  }

  return { successfullyCreated, errors }
}
