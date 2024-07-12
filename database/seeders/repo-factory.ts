import { faker } from '@faker-js/faker'
import { generateIdFromEntropySize } from 'lucia'
import type { CodeRepo, User, Tag } from '@prisma/client'
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

async function generateCodeRepos(count: number = 10) {
  const codeRepos: { repo: CodeRepo; tags: string[] }[] = []
  const users: User[] = await prisma.user.findMany()
  const selectedRepo = faker.helpers.arrayElement([
    PROJECT_MANAGEMENT,
    KANBAN,
    QUIZ_APP,
  ])
  const selectedRepoCss = {
    [PROJECT_MANAGEMENT]: PROJECT_MANAGEMENT_CSS,
    [KANBAN]: KANBAN_CSS,
    [QUIZ_APP]: QUIZ_APP_CSS,
  }

  const usedNames = new Set<string>()

  for (let i = 0; i < count; i++) {
    const userId = faker.helpers.arrayElement(users).id
    const priceAmount = Math.floor(
      parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 }))
    )
    const { createdAt, updatedAt, deletedAt } = generateDates()

    let name: string
    do {
      name = faker.company.name()
    } while (usedNames.has(name))
    usedNames.add(name)

    const codeRepo: CodeRepo = {
      id: generateIdFromEntropySize(32),
      userId: userId,
      sourceJs: selectedRepo,
      sourceCss: selectedRepoCss[selectedRepo as keyof typeof selectedRepoCss],
      createdAt,
      updatedAt,
      deletedAt,
      visibility: randomBoolean() ? 'public' : 'private',
      status: faker.helpers.arrayElement(['pending', 'active', 'rejected']),
      name,
      description: faker.lorem.sentences(),
      language: faker.helpers.arrayElement(['JSX', 'TSX']),
      price: priceAmount,
    }
    codeRepos.push({
      repo: codeRepo,
      tags: faker.helpers.arrayElements(REPO_TAGS, faker.number.int({ min: 1, max: 8 })),
    })
    console.log('Generated code repo:', codeRepo.name)
  }
  return codeRepos
}

export async function seedCodeRepos(count: number = 50) {
  try {
    const codeReposWithTags = await generateCodeRepos(count)

    for (const { repo, tags } of codeReposWithTags) {
      try {
        const createdRepo = await prisma.codeRepo.create({
          data: {
            ...repo,
            tags: {
              create: tags.map((tagName) => ({
                name: tagName,
              })),
            },
          },
        })
        console.log(`Created code repo: ${createdRepo.name} with ${tags.length} tags`)
      } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
          console.warn(`Skipping duplicate repo name: ${repo.name}`)
        } else {
          console.error(`Error creating repo ${repo.name}:`, error)
        }
      }
    }
    console.log('Finished seeding code repos')
  } catch (error) {
    console.error('Error seeding code repos:', error)
  } finally {
    await prisma.$disconnect()
  }
}
