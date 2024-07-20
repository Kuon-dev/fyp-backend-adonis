import { faker } from '@faker-js/faker'
import { generateIdFromEntropySize } from 'lucia'
import type { CodeRepo, User, Tag, Profile, SellerProfile } from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { generateDates, randomBoolean, weightedRandomTrueBoolean } from './utils.js'
import {
  REPO_TAGS,
  PROJECT_MANAGEMENT,
  PROJECT_MANAGEMENT_CSS,
  KANBAN,
  KANBAN_CSS,
  QUIZ_APP,
  QUIZ_APP_CSS,
} from './constants.js'

interface SeederConfig {
  verifiedSellerProbability: number;
  maxReposPerUser: number;
}

const defaultConfig: SeederConfig = {
  verifiedSellerProbability: 0.8,
  maxReposPerUser: 5,
}

// Function to generate a unique name
function generateUniqueName(
  user: User & { profile: Profile | null },
  existingNames: Set<string>
): string {
  const maxAttempts = 100
  let attempt = 0

  while (attempt < maxAttempts) {
    const userName = user.profile?.name ?? 'user'
    const companyName = faker.company.name()
    let name = `${userName} - ${companyName}`.replace(/\s+/g, '_').toLowerCase()

    if (!existingNames.has(name)) {
      existingNames.add(name)
      return name
    }

    attempt++
  }

  throw new Error('Unable to generate a unique name after maximum attempts')
}

// Function to select a user with higher chance of selecting a verified seller
function selectUser(
  verifiedSellers: (User & { sellerProfile: SellerProfile | null; profile: Profile | null })[],
  otherUsers: (User & { sellerProfile: SellerProfile | null; profile: Profile | null })[],
  userRepoCounts: Map<string, number>,
  config: SeederConfig
) {
  const eligibleVerifiedSellers = verifiedSellers.filter(user => (userRepoCounts.get(user.id) || 0) < config.maxReposPerUser)
  const eligibleOtherUsers = otherUsers.filter(user => (userRepoCounts.get(user.id) || 0) < config.maxReposPerUser)

  if (eligibleVerifiedSellers.length > 0 && Math.random() < config.verifiedSellerProbability) {
    return faker.helpers.arrayElement(eligibleVerifiedSellers)
  }

  const allEligibleUsers = [...eligibleVerifiedSellers, ...eligibleOtherUsers]
  if (allEligibleUsers.length === 0) {
    throw new Error('No eligible users available to create more repos')
  }

  return faker.helpers.arrayElement(allEligibleUsers)
}

async function generateCodeRepos(count: number = 10, config: SeederConfig) {
  const codeRepos: { repo: Omit<CodeRepo, 'id'>; tags: string[] }[] = []
  const allUsers = await prisma.user.findMany({
    include: { sellerProfile: true, profile: true },
  })

  if (allUsers.length === 0) {
    throw new Error('No users found in the database. Please seed users first.')
  }

  const verifiedSellers = allUsers.filter(user => 
    user.sellerProfile && user.sellerProfile.verificationStatus === 'APPROVED'
  )
  const otherUsers = allUsers.filter(user => 
    !user.sellerProfile || user.sellerProfile.verificationStatus !== 'APPROVED'
  )

  const existingNames = new Set<string>()
  const dbNames = await prisma.codeRepo.findMany({ select: { name: true } })
  dbNames.forEach((r) => existingNames.add(r.name))

  const userRepoCounts = new Map<string, number>()

  for (let i = 0; i < count; i++) {
    try {
      const user = selectUser(verifiedSellers, otherUsers, userRepoCounts, config)
      userRepoCounts.set(user.id, (userRepoCounts.get(user.id) || 0) + 1)

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
        visibility: weightedRandomTrueBoolean() ? 'public' : 'private',
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

export async function seedCodeRepos(count: number = 50, customConfig?: Partial<SeederConfig>) {
  const config = { ...defaultConfig, ...customConfig }
  let successfullyCreated = 0
  const errors: Error[] = []
  const distributionStats = {
    verifiedSellers: 0,
    otherUsers: 0,
  }

  try {
    const codeReposWithTags = await generateCodeRepos(count, config)

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
            include: { user: { include: { sellerProfile: true } } },
          })
          console.log(`Created code repo: ${createdRepo.name} with ${tags.length} tags`)
          successfullyCreated++

          // Update distribution stats
          if (createdRepo.user.sellerProfile?.verificationStatus === 'APPROVED') {
            distributionStats.verifiedSellers++
          } else {
            distributionStats.otherUsers++
          }
        })
      } catch (error) {
        console.error(`Error creating repo ${repo.name}:`, error)
        errors.push(error)
      }
    }

    console.log(`Successfully seeded ${successfullyCreated} out of ${count} requested code repos`)
    console.log('Distribution of created repos:')
    console.log(`Verified Sellers: ${distributionStats.verifiedSellers}`)
    console.log(`Other Users: ${distributionStats.otherUsers}`)
    if (errors.length > 0) {
      console.log(`Encountered ${errors.length} errors during seeding`)
    }
  } catch (error) {
    console.error('Error generating code repos:', error)
  } finally {
    await prisma.$disconnect()
  }

  return { successfullyCreated, errors, distributionStats }
}
