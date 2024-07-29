import { sql } from 'kysely'
import { inject } from '@adonisjs/core'
import { CodeRepo, CodeRepoStatus, OrderStatus, Tag, Visibility } from '@prisma/client'
import { kyselyDb } from '#database/kysely'
import { prisma } from './prisma_service.js'
import { publishRepoSchema } from '#validators/repo'
import { z } from 'zod'
import CodeCheckService from './code_check_service.js'
import {
  RepoExistenceHandler,
  UserAuthorizationHandler,
  RepoStatusHandler,
  RepoContentHandler,
  CodeCheckHandler,
  CodeQualityHandler,
  RepoCheckHandler,
  RepoCheckContext,
} from '../handlers/repo.js'

type PartialCodeRepo = Omit<CodeRepo, 'sourceJs' | 'sourceCss' | 'userId'> & {
  sourceJs?: string
  sourceCss?: string
  tags?: { tag: Tag }[]
}

type RepoCheckoutInfo = {
  repo: PartialCodeRepo
  sellerProfileId: string | null
}

interface CodeRepoWithTags extends CodeRepo {
  tags: string[]
}

type CreateRepoData = Omit<CodeRepo, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  tags: string[]
}

@inject()
export default class RepoService {
  constructor(protected codeCheckService: CodeCheckService) {}

  private createPublishChain(): RepoCheckHandler {
    const repoExistenceHandler = new RepoExistenceHandler()
    const userAuthorizationHandler = new UserAuthorizationHandler()
    const repoStatusHandler = new RepoStatusHandler(CodeRepoStatus.active)
    const repoContentHandler = new RepoContentHandler()
    const codeCheckHandler = new CodeCheckHandler(this.codeCheckService)

    repoExistenceHandler
      .setNext(userAuthorizationHandler)
      .setNext(repoStatusHandler)
      .setNext(repoContentHandler)
      .setNext(codeCheckHandler)

    return repoExistenceHandler
  }

  private createSubmitCodeCheckChain(): RepoCheckHandler {
    const repoExistenceHandler = new RepoExistenceHandler()
    const userAuthorizationHandler = new UserAuthorizationHandler()
    const repoContentHandler = new RepoContentHandler()
    const codeCheckHandler = new CodeCheckHandler(this.codeCheckService)
    const codeQualityHandler = new CodeQualityHandler()

    repoExistenceHandler
      .setNext(userAuthorizationHandler)
      .setNext(repoContentHandler)
      .setNext(codeCheckHandler)
      .setNext(codeQualityHandler)

    return repoExistenceHandler
  }

  public async createRepo(data: CreateRepoData & { userId: string }): Promise<CodeRepo> {
    const { userId, tags, ...repoData } = data

    // Validate the input data
    return await prisma.$transaction(async (tx) => {
      // Check if the user already has a repo with the same name
      const existingRepo = await tx.codeRepo.findFirst({
        where: {
          userId: userId,
          name: repoData.name,
          deletedAt: null, // Ensure we don't count deleted repos
        },
      })

      if (existingRepo) {
        throw new Error(`You already have a repo named "${repoData.name}"`)
      }

      // If no existing repo with the same name, create the new repo
      const repo = await tx.codeRepo.create({
        data: {
          ...repoData,
          userId,
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
        include: { tags: true },
      })

      return repo
    })
  }

  public async getRepoById(id: string, _userId?: string | null): Promise<CodeRepoWithTags | null> {
    const repo = await prisma.codeRepo.findUnique({
      where: {
        id,
        deletedAt: null, // Only return non-deleted repos
      },
      include: {
        tags: {
          include: {
            tag: true, // Include the actual tag data
          },
        },
      },
    })

    if (!repo) return null

    // Transform the tags to return only the tag names
    const transformedRepo: CodeRepoWithTags = {
      ...repo,
      tags: repo.tags.map((tagRelation) => tagRelation.tag.name),
    }

    return transformedRepo
  }

  public async updateRepo(
    id: string,
    data: Partial<CodeRepo> & { tags?: string[] }
  ): Promise<CodeRepo> {
    const { tags, ...otherData } = data

    const updatedRepo = await prisma.codeRepo.update({
      where: { id },
      data: {
        ...otherData,
        tags: tags
          ? {
              deleteMany: {},
              create: tags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    })

    return updatedRepo
  }

  /**
   * @getRepoByIdPublic
   * @description Get a public repo by ID, excluding soft deleted repos.
   * @param id - The ID of the Repo to retrieve.
   * @returns Promise<PartialCodeRepo | null> - The partial CodeRepo object or null if not found.
   */
  public async getRepoByIdPublic(id: string): Promise<PartialCodeRepo | null> {
    const repo = await prisma.codeRepo.findFirst({
      where: {
        id,
        deletedAt: null,
        visibility: 'public',
      },
      select: {
        id: true,
        name: true,
        description: true,
        language: true,
        price: true,
        visibility: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        tags: {
          select: {
            tag: true,
          },
        },
      },
    })

    if (!repo) return null

    return repo
  }

  /**
   * Check if a user has purchased a repo.
   *
   * @param userId - The ID of the user.
   * @param repoId - The ID of the repo.
   * @returns Promise<boolean> - True if the user has purchased the repo, false otherwise.
   */
  private async hasPurchased(userId: string, repoId: string): Promise<boolean> {
    const count = await prisma.order.count({
      where: {
        userId,
        codeRepoId: repoId,
        status: 'completed' as OrderStatus,
      },
    })
    return count > 0
  }
  /**
   * @softDeleteRepo
   * @description Soft delete a Repo by ID by setting the deletedAt timestamp.
   * @param id - The ID of the Repo to soft delete.
   * @returns Promise<CodeRepo> - The soft deleted CodeRepo object.
   * @throws Error if the repo is not found or if the operation fails.
   */
  public async softDeleteRepo(id: string): Promise<CodeRepo> {
    return await prisma.$transaction(async (tx) => {
      const repo = await tx.codeRepo.findUnique({ where: { id } })
      if (!repo) {
        throw new Error('Repo not found')
      }

      // Always update the repo, even if it's already deleted
      const softDeletedRepo = await tx.codeRepo.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          visibility: 'private',
        },
      })
      return softDeletedRepo
    })
  }

  /**
   * @publishRepo
   * @description Publish a repo by updating its status to active, performing necessary checks, and running a code check.
   * @param data - Object containing repo id and user id.
   * @returns Promise<CodeRepo> - The updated CodeRepo.
   * @throws Error if the repo is not found, user is not authorized, or if the operation fails.
   */
  public async publishRepo(data: z.infer<typeof publishRepoSchema>): Promise<CodeRepo> {
    const { id, userId } = publishRepoSchema.parse(data)

    const repo = await prisma.codeRepo.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!repo) {
      throw new Error('Repo not found')
    }

    const context: RepoCheckContext = { repo, userId }
    const chain = this.createPublishChain()

    try {
      await chain.handle(context)
    } catch (error) {
      throw new Error(`Failed to publish repo: ${error.message}`)
    }

    return await prisma.$transaction(async (tx) => {
      const updatedRepo = await tx.codeRepo.update({
        where: { id },
        data: {
          status: CodeRepoStatus.active,
          visibility: Visibility.public,
          updatedAt: new Date(),
        },
      })

      await tx.codeCheck.create({
        data: {
          repoId: id,
          ...context.codeCheckResult!,
        },
      })

      return updatedRepo
    })
  }

  public async submitCodeCheck(repoId: string, userId: string): Promise<CodeRepo> {
    const repo = await prisma.codeRepo.findUnique({
      where: { id: repoId },
      include: { user: true },
    })

    if (!repo) {
      throw new Error('Repo not found')
    }

    const context: RepoCheckContext = { repo, userId }
    const chain = this.createSubmitCodeCheckChain()

    try {
      await chain.handle(context)
    } catch (error) {
      throw new Error(`Failed to submit code check: ${error.message}`)
    }

    return await prisma.$transaction(async (tx) => {
      const updatedRepo = await tx.codeRepo.update({
        where: { id: repoId },
        data: {
          //status: CodeRepoStatus.active,
          //visibility: Visibility.public,
          updatedAt: new Date(),
        },
      })

      await tx.codeCheck.create({
        data: {
          repoId: repoId,
          ...context.codeCheckResult!,
        },
      })

      return updatedRepo
    })
  }

  /**
   * Retrieve paginated Repos with public visibility.
   *
   * @param page - The page number for pagination.
   * @param limit - The number of items per page.
   * @param userId - The ID of the user requesting the pagination (can be null for guests).
   * @returns Promise<{ data: PartialCodeRepo[]; total: number; page: number; limit: number }> - Paginated results.
   */

  public async getPaginatedRepos(
    page: number = 1,
    limit: number = 10,
    userId: string | null
  ): Promise<{ data: PartialCodeRepo[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit

    let query = kyselyDb
      .selectFrom('CodeRepo as cr')
      .leftJoin('TagsOnRepos as tor', 'cr.id', 'tor.codeRepoId')
      .leftJoin('Tag as t', 'tor.tagId', 't.id')
      .selectAll('cr')
      .select('t.name as tagName')
      .where('cr.visibility', '=', 'public')
      .where('cr.status', '=', 'active')
      .distinctOn('cr.id')
      .limit(limit)
      .offset(offset)

    if (userId) {
      // Fetch user's recent search tags
      const recentTags = await prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10, // Adjust as needed
      })

      const recentTagNames = recentTags.map((tag) => tag.tag)

      // Prioritize repos that match recent search tags
      query = query
        .orderBy(
          sql`CASE WHEN t.name IN (${recentTagNames.map((tag) => `'${tag}'`).join(', ')}) THEN 1 ELSE 2 END`
        )
        .orderBy('cr.createdAt', 'desc')
    }

    const repos = await query.execute()
    const total = await prisma.codeRepo.count({
      where: {
        visibility: 'public',
        status: 'active',
      },
    })

    // Filter out source code for unauthorized users
    const filteredRepos = await Promise.all(
      repos.map(async (repo) => {
        const partialRepo: PartialCodeRepo = { ...repo }
        if (userId) {
          const user = await prisma.user.findUnique({ where: { id: userId } })
          const hasAccess =
            repo.userId === userId ||
            user?.role === 'ADMIN' ||
            (await this.hasPurchased(userId, repo.id))

          if (!hasAccess) {
            delete partialRepo.sourceJs
            delete partialRepo.sourceCss
          }
        } else {
          delete partialRepo.sourceJs
          delete partialRepo.sourceCss
        }
        return partialRepo
      })
    )

    return { data: filteredRepos, total, page, limit }
  }

  /**
   * Record search tag for a user.
   *
   * @param userId - The ID of the user.
   * @param tag - The searched tag.
   */
  public async recordSearch(userId: string, tag: string): Promise<void> {
    await prisma.searchHistory.create({
      data: {
        userId,
        tag,
      },
    })
  }

  /**
   * Retrieve Repos by user ID.
   *
   * @param userId - The user ID to filter by.
   * @returns Promise<CodeRepo[]> - Array of CodeRepo objects belonging to the user.
   */
  public async getReposByUser(userId: string): Promise<CodeRepo[]> {
    try {
      const repos = await prisma.codeRepo.findMany({
        where: {
          userId: userId,
          deletedAt: null, // Only return non-deleted repos
        },
        include: {
          tags: true, // Include tags to match the previous implementation
        },
      })
      return repos
    } catch (error) {
      console.error('Error fetching repos by user:', error)
      throw new Error('Failed to fetch repos by user')
    }
  }

  public async getFeaturedRepos(limit: number = 5): Promise<CodeRepo[]> {
    const featuredRepos = await prisma.codeRepo.findMany({
      where: {
        visibility: 'public',
        status: 'active',
        deletedAt: null,
      },
      include: {
        reviews: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
      orderBy: [{ reviews: { _count: 'desc' } }, { updatedAt: 'desc' }],
      take: limit,
    })

    // Calculate average rating for each repo
    const reposWithRatings = featuredRepos.map((repo) => {
      const avgRating =
        repo.reviews.reduce((sum, review) => sum + review.rating, 0) / repo.reviews.length || 0
      return { ...repo, avgRating }
    })

    // Sort by average rating and then by number of reviews
    return reposWithRatings.sort(
      (a, b) => b.avgRating - a.avgRating || b.reviews.length - a.reviews.length
    )
  }

  /**
   * Get a repo by its ID, including necessary related data for checkout.
   *
   * @param id - The ID of the repo.
   * @returns Promise<RepoCheckoutInfo | null> - The repo data and seller info, or null if not found.
   */
  public async getRepoForCheckout(id: string): Promise<RepoCheckoutInfo | null> {
    const repo = await prisma.codeRepo.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            sellerProfile: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    if (!repo) return null

    const { sourceJs, sourceCss, user, ...safeRepo } = repo
    return {
      repo: safeRepo,
      sellerProfileId: user?.sellerProfile?.id ?? null,
    }
  }
}
