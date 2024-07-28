import { faker } from '@faker-js/faker'
import { generateIdFromEntropySize } from 'lucia'
import type { CodeRepo, User, Profile, SellerProfile, CodeRepoStatus } from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { generateDates, weightedRandomTrueBoolean } from './utils.js'
import {
  BUTTON_COMPONENTS,
  CARD_COMPONENTS,
  COMPONENTS_CSS,
  INPUT_COMPONENTS,
  REPO_TAGS,
} from './constants.js'

interface SeederConfig {
  verifiedSellerProbability: number;
  maxReposPerUser: number;
  activeRepoProbability: number;
}

const defaultConfig: SeederConfig = {
  verifiedSellerProbability: 0.8,
  maxReposPerUser: 5,
  activeRepoProbability: 0.8,
}

// List of common React component types
const componentTypes = [
  'Button', 'Form', 'Modal', 'Navbar', 'Sidebar', 'Card', 'Table', 'Chart', 'Dropdown',
  'Accordion', 'Carousel', 'Tabs', 'Tooltip', 'Pagination', 'Progress Bar', 'Menu',
  'Avatar', 'Badge', 'Alert', 'Toast', 'Spinner', 'Stepper', 'DatePicker', 'TimePicker',
  'Slider', 'Toggle Switch', 'Rating', 'Breadcrumb', 'Tree View', 'Tag Input',
];

// List of adjectives to describe components
const adjectives = [
  'Responsive', 'Animated', 'Customizable', 'Accessible', 'Themeable', 'Interactive',
  'Lightweight', 'Reusable', 'Flexible', 'Dynamic', 'Modern', 'Sleek', 'Minimalist',
  'Feature-rich', 'High-performance', 'Scalable', 'Intuitive', 'User-friendly',
];

// List of frameworks or libraries
const frameworks = [
  'React', 'Next.js', 'Redux', 'Material-UI', 'Styled Components', 'Tailwind CSS',
  'Chakra UI', 'Ant Design', 'Bootstrap', 'Framer Motion', 'React Spring',
];

function generateRepoName(): string {
  const adjective = faker.helpers.arrayElement(adjectives);
  const componentType = faker.helpers.arrayElement(componentTypes);
  const framework = faker.helpers.arrayElement(frameworks);
  
  // Randomly decide whether to include the framework name
  const includeFramework = Math.random() > 0.5;
  
  if (includeFramework) {
    return `${adjective} ${framework} ${componentType}`;
  } else {
    return `${adjective} ${componentType} Component`;
  }
}

function generateUniqueName(existingNames: Set<string>): string {
  const maxAttempts = 100;
  let attempt = 0;

  while (attempt < maxAttempts) {
    const name = generateRepoName();
    if (!existingNames.has(name)) {
      existingNames.add(name);
      return name;
    }
    attempt++;
  }

  throw new Error('Unable to generate a unique name after maximum attempts');
}

function generateRepoDescription(name: string, tags: string[]): string {
  const componentType = name.split(' ').pop()!.replace('Component', '').trim()
  const isAnimated = tags.includes('animated') || name.toLowerCase().includes('animated')
  const isAccessible = tags.includes('accessibility') || name.toLowerCase().includes('accessible')
  const framework = frameworks.find(fw => name.includes(fw)) || 'React'

  let description = `A ${isAnimated ? 'dynamic and animated' : 'sleek and modern'} ${componentType} component built for ${framework}. `

  description += `This component is designed to be ${faker.helpers.arrayElement(['highly customizable', 'easily integrable', 'performance-optimized'])}`
  
  if (isAccessible) {
    description += ` and fully accessible, adhering to WCAG guidelines. `
  } else {
    description += `. `
  }

  description += `Perfect for ${faker.helpers.arrayElement([
    'creating engaging user interfaces',
    'enhancing user experience',
    'building responsive web applications',
    'streamlining your development process'
  ])}, this ${componentType} offers ${faker.helpers.arrayElement([
    'a range of customization options',
    'seamless integration with existing projects',
    'robust functionality out of the box',
    'a balance of aesthetics and performance'
  ])}. `

  if (tags.includes('typescript')) {
    description += `Fully typed with TypeScript for improved developer experience. `
  }

  if (tags.includes('responsive-design')) {
    description += `Responsive design ensures compatibility across all device sizes. `
  }

  description += `Ideal for ${faker.helpers.arrayElement([
    'both beginners and experienced developers',
    'rapid prototyping and production-ready applications',
    'creating consistent and branded user interfaces',
    'developers looking to enhance their React projects'
  ])}.`

  return description
}

// Function to select a seller with higher chance of selecting a verified seller
function selectSeller(
  verifiedSellers: (User & { sellerProfile: SellerProfile; profile: Profile | null })[],
  unverifiedSellers: (User & { sellerProfile: SellerProfile; profile: Profile | null })[],
  sellerRepoCounts: Map<string, number>,
  config: SeederConfig
) {
  const eligibleVerifiedSellers = verifiedSellers.filter(seller => (sellerRepoCounts.get(seller.id) || 0) < config.maxReposPerUser)
  const eligibleUnverifiedSellers = unverifiedSellers.filter(seller => (sellerRepoCounts.get(seller.id) || 0) < config.maxReposPerUser)

  if (eligibleVerifiedSellers.length > 0 && Math.random() < config.verifiedSellerProbability) {
    return faker.helpers.arrayElement(eligibleVerifiedSellers)
  }

  const allEligibleSellers = [...eligibleVerifiedSellers, ...eligibleUnverifiedSellers]
  if (allEligibleSellers.length === 0) {
    throw new Error('No eligible sellers available to create more repos')
  }

  return faker.helpers.arrayElement(allEligibleSellers)
}

async function generateCodeRepos(count: number = 10, config: SeederConfig) {
  const codeRepos: { repo: Omit<CodeRepo, 'id'>; tags: string[] }[] = []
  const allSellers = await prisma.user.findMany({
    where: {
      sellerProfile: {
        isNot: null,
      },
    },
    include: { sellerProfile: true, profile: true },
  })

  if (allSellers.length === 0) {
    throw new Error('No sellers found in the database. Please seed sellers first.')
  }

  const verifiedSellers = allSellers.filter(seller =>
    seller.sellerProfile && seller.sellerProfile.verificationStatus === 'APPROVED'
  ) as (User & { sellerProfile: SellerProfile; profile: Profile | null })[]

  const unverifiedSellers = allSellers.filter(seller =>
    seller.sellerProfile && seller.sellerProfile.verificationStatus !== 'APPROVED'
  ) as (User & { sellerProfile: SellerProfile; profile: Profile | null })[]

  const existingNames = new Set<string>()
  const dbNames = await prisma.codeRepo.findMany({ select: { name: true } })
  dbNames.forEach((r) => existingNames.add(r.name))

  const sellerRepoCounts = new Map<string, number>()

  for (let i = 0; i < count; i++) {
    try {
      const seller = selectSeller(verifiedSellers, unverifiedSellers, sellerRepoCounts, config)
      sellerRepoCounts.set(seller.id, (sellerRepoCounts.get(seller.id) || 0) + 1)

      const selectedRepo = faker.helpers.arrayElement([BUTTON_COMPONENTS, CARD_COMPONENTS, INPUT_COMPONENTS])

      const priceAmount = Math.floor(
        parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 }))
      )
      const { createdAt, updatedAt, deletedAt } = generateDates()
      const status: CodeRepoStatus = Math.random() < config.activeRepoProbability ? 'active' : faker.helpers.arrayElement(['pending', 'rejected'])
      const repoTags = faker.helpers.arrayElements(REPO_TAGS, faker.number.int({ min: 1, max: 8 }))
      const repoName = generateUniqueName(existingNames)

      const codeRepo: Omit<CodeRepo, 'id'> = {
        userId: seller.id,
        sourceJs: selectedRepo,
        sourceCss: COMPONENTS_CSS,
        createdAt,
        updatedAt,
        deletedAt,
        visibility: weightedRandomTrueBoolean() ? 'public' : 'private',
        status: status,
        name: generateUniqueName(existingNames),
        description: generateRepoDescription(repoName, repoTags),
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
    unverifiedSellers: 0,
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
            distributionStats.unverifiedSellers++
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
    console.log(`Unverified Sellers: ${distributionStats.unverifiedSellers}`)
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
