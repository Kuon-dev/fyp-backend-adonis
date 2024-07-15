import { SelectQueryBuilder, expressionBuilder, sql } from 'kysely'
import type { CodeRepo, OrderStatus } from '@prisma/client'
import { kyselyDb } from '#database/kysely'
import { prisma } from './prisma_service.js'

type PartialCodeRepo = Omit<CodeRepo, 'sourceJs' | 'sourceCss'> & {
  sourceJs?: string
  sourceCss?: string
}

export default class RepoService {
  public async createRepo(
    data: Omit<
      CodeRepo,
      'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'stripeProductId' | 'stripePriceId'
    > & { tags: string[] }
  ): Promise<CodeRepo> {
    const repo = await prisma.codeRepo.create({
      data: {
        ...data,
        tags: {
          create: data.tags.map((tagName) => ({
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
  }

  public async getRepoById(id: string, userId: string | null): Promise<PartialCodeRepo | null> {
    const repo = await prisma.codeRepo.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            comments: {
              take: 2,
            },
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        orders: true,
      },
    })

    if (repo && userId) {
      // Record search for each tag
      for (const tagOnRepo of repo.tags) {
        await this.recordSearch(userId, tagOnRepo.tag.name)
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      const hasAccess =
        repo.userId === userId || user?.role === 'ADMIN' || (await this.hasPurchased(userId, id))
      const partialRepo: PartialCodeRepo = { ...repo } as PartialCodeRepo

      if (!hasAccess) {
        delete partialRepo.sourceJs
        delete partialRepo.sourceCss
      }
      return partialRepo
    }

    return repo
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

  public async getRepoByIdPublic(id: string): Promise<PartialCodeRepo | null> {
    const repo = await prisma.codeRepo.findUnique({
      where: { id },
      include: {
        tags: true,
      },
    })

    return repo
  }

  /**
   * Delete a Repo by ID.
   *
   * @param id - The ID of the Repo.
   * @returns Promise<CodeRepo> - The deleted CodeRepo object.
   */
  public async deleteRepo(id: string): Promise<CodeRepo> {
    return await prisma.codeRepo.delete({
      where: { id },
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
   * Search Repos by dynamic criteria.
   *
   * @param specifications - The list of specifications to filter by.
   * @param userId - The ID of the user performing the search (can be null for guests).
   * @returns Promise<PartialCodeRepo[]> - Array of CodeRepo objects matching the search criteria.
   */
  public async searchRepos(
    specifications: RepoSpecification[],
    userId: string | null
  ): Promise<PartialCodeRepo[]> {
    const compositeSpecification = new CompositeSpecification()
    specifications.forEach((spec) => compositeSpecification.add(spec))

    let query = kyselyDb
      .selectFrom('CodeRepo as cr')
      .leftJoin('TagsOnRepos as tor', 'cr.id', 'tor.codeRepoId')
      .leftJoin('Tag as t', 'tor.tagId', 't.id')
      .selectAll('cr')
      .select('t.name as tagName')

    query = compositeSpecification.apply(query)

    if (userId) {
      // Record search for each tag specification
      for (const spec of specifications) {
        if (spec instanceof TagSpecification) {
          for (const tag of spec.tags) {
            await this.recordSearch(userId, tag)
          }
        }
      }

      // Fetch user's recent search tags
      const recentTags = await prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      const recentTagNames = recentTags.map((tag) => tag.tag)

      // Prioritize repos that match recent search tags
      query = query.orderBy(
        sql`CASE WHEN t.name IN (${recentTagNames.map((tag) => `'${tag}'`).join(', ')}) THEN 1 ELSE 2 END`
      )
      query = query.orderBy('cr.createdAt', 'desc')
    }

    const repos = await query.execute()

    // Filter out source code for unauthorized users
    const partialRepos = await Promise.all(
      repos.map(async (repo) => {
        const partialRepo: PartialCodeRepo = { ...repo } as PartialCodeRepo

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

    return partialRepos
  }

  /**
   * Retrieve Repos by user ID.
   *
   * @param userId - The user ID to filter by.
   * @returns Promise<CodeRepo[]> - Array of CodeRepo objects belonging to the user.
   */
  public async getReposByUser(userId: string): Promise<CodeRepo[]> {
    const query = kyselyDb.selectFrom('CodeRepo').selectAll().where('userId', '=', userId)
    return await query.execute()
  }

  /**
   * Retrieve all Repos without filtering by visibility.
   *
   * @returns Promise<CodeRepo[]> - Array of all CodeRepo objects.
   */
  public async getAllRepos(): Promise<CodeRepo[]> {
    return await prisma.codeRepo.findMany({
      include: {
        reviews: true,
        tags: true,
        orders: true,
      },
    })
  }

  public async getFeaturedRepos(limit: number = 5): Promise<CodeRepo[]> {
    const featuredRepos = await prisma.codeRepo.findMany({
      where: {
        visibility: 'public',
        status: 'active',
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
}

/**
 * Interface for Repository specifications used in search queries.
 */
interface RepoSpecification {
  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any>
}

/**
 * Specification for filtering repos by visibility.
 */
export class VisibilitySpecification implements RepoSpecification {
  constructor(private visibility: string) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return query.where('cr.visibility', '=', this.visibility)
  }
}

/**
 * Specification for filtering repos by tags.
 */
export class TagSpecification implements RepoSpecification {
  constructor(public tags: string[]) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    const eb = expressionBuilder(query)

    return query.where(
      eb.exists(
        eb
          .selectFrom('Tag as t')
          .select('t.id')
          .whereRef('t.repoId', '=', 'cr.id')
          .where('t.name', 'in', this.tags)
      )
    )
  }
}

/**
 * Specification for filtering repos by language.
 */
export class LanguageSpecification implements RepoSpecification {
  constructor(private language: string) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return query.where('cr.language', '=', this.language)
  }
}

/**
 * Specification for filtering repos by user ID.
 */
export class UserSpecification implements RepoSpecification {
  constructor(private userId: string) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return query.where('cr.userId', '=', this.userId)
  }
}

/**
 * Specification for searching repos by name or description.
 */
export class SearchSpecification implements RepoSpecification {
  constructor(private searchQuery: string) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return query.where((eb) =>
      eb.or([
        eb('cr.name', 'ilike', `%${this.searchQuery}%`),
        eb('cr.description', 'ilike', `%${this.searchQuery}%`),
      ])
    )
  }
}

/**
 * Composite specification for combining multiple specifications.
 */
export class CompositeSpecification implements RepoSpecification {
  private specifications: RepoSpecification[] = []

  add(spec: RepoSpecification): void {
    this.specifications.push(spec)
  }

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return this.specifications.reduce((acc, spec) => {
      return spec.apply(acc)
    }, query)
  }
}
