
import { SelectQueryBuilder, expressionBuilder, sql } from "kysely";
import type { CodeRepo, OrderStatus } from "@prisma/client";
import { kyselyDb } from "#database/kysely";
import { prisma } from "./prisma_service.js";
import env from "#start/env";
import Stripe from "stripe";
import logger from '@adonisjs/core/services/logger'

const stripe = new Stripe(env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-04-10',
});

// Create a type that makes sourceJs and sourceCss optional
type PartialCodeRepo = Omit<CodeRepo, 'sourceJs' | 'sourceCss'> & {
  sourceJs?: string;
  sourceCss?: string;
};

/**
 * Service class for handling Repo operations.
 */
export default class RepoService {
  /**
   * Create a new Repo.
   *
   * @param data - The data to create a new Repo.
   */
  public async createRepo(data: Omit<CodeRepo, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'stripeProductId' | 'stripePriceId'> & { tags: string[] }): Promise<CodeRepo> {
    logger.info(data);

    const repo = await prisma.codeRepo.create({
      data: {
        ...data,
        tags: {
          connectOrCreate: data.tags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
      include: {
        tags: true,
      },
    });

    const product = await stripe.products.create({
      name: data.name,
      description: data.description || undefined,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: data.price * 100, // converting to cents
      currency: 'usd',
    });

    console.log("Product created: ", product);
    console.log("Price created: ", price);

    await prisma.codeRepo.update({
      where: { id: repo.id },
      data: {
        stripeProductId: product.id,
        stripePriceId: price.id,
      },
    });

    return repo;
  }

  /**
   * Retrieve a Repo by ID.
   *
   * @param id - The ID of the Repo.
   * @param userId - The ID of the user viewing the repo (can be null for guests).
   */
  public async getRepoById(id: string, userId: string | null): Promise<PartialCodeRepo | null> {
    const repo = await prisma.codeRepo.findUnique({
      where: { id },
      include: {
        reviews: true,
        tags: true,
        orders: true,
        codeChecks: true,
      },
    });

    if (repo && userId) {
      for (const tag of repo.tags) {
        await this.recordSearch(userId, tag.name);
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const hasAccess = repo.userId === userId || user?.role === 'ADMIN' || await this.hasPurchased(userId, id);
      const partialRepo: PartialCodeRepo = { ...repo } as PartialCodeRepo;

      if (!hasAccess) {
        delete partialRepo.sourceJs;
        delete partialRepo.sourceCss;
      }
      return partialRepo;
    }

    return repo;
  }

  /**
   * Check if a user has purchased a repo.
   *
   * @param userId - The ID of the user.
   * @param repoId - The ID of the repo.
   */
  private async hasPurchased(userId: string, repoId: string): Promise<boolean> {
    const count = await prisma.order.count({
      where: {
        userId,
        codeRepoId: repoId,
        status: 'completed' as OrderStatus,
      },
    });
    return count > 0;
  }

  /**
   * Update a Repo.
   *
   * @param id - The ID of the Repo.
   * @param data - The data to update the Repo.
   */
  public async updateRepo(id: string, data: Partial<CodeRepo>): Promise<CodeRepo> {
    return await prisma.codeRepo.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a Repo by ID.
   *
   * @param id - The ID of the Repo.
   */
  public async deleteRepo(id: string): Promise<CodeRepo> {
    return await prisma.codeRepo.delete({
      where: { id },
    });
  }

  /**
   * Retrieve paginated Repos with public visibility.
   *
   * @param page - The page number for pagination.
   * @param limit - The number of items per page.
   * @param userId - The ID of the user requesting the pagination (can be null for guests).
   */
  public async getPaginatedRepos(page: number = 1, limit: number = 10, userId: string | null): Promise<{ data: PartialCodeRepo[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    let query = kyselyDb.selectFrom("CodeRepo").selectAll().where("visibility", "=", "public").limit(limit).offset(offset);

    if (userId) {
      const recentTags = await prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const recentTagNames = recentTags.map(tag => tag.tag);

      query = query
        .orderBy(
          sql`CASE WHEN tags @> ARRAY[${recentTagNames.map(tag => `'${tag}'`).join(', ')}] THEN 1 ELSE 2 END`
        )
        .orderBy('createdAt', 'desc');
    }

    const repos = await query.execute();
    const total = await prisma.codeRepo.count({
      where: {
        visibility: 'public',
      },
    });

    const filteredRepos = await Promise.all(repos.map(async (repo) => {
      const partialRepo: PartialCodeRepo = { ...repo };
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const hasAccess = repo.userId === userId || user?.role === 'ADMIN' || await this.hasPurchased(userId, repo.id);

        if (!hasAccess) {
          delete partialRepo.sourceJs;
          delete partialRepo.sourceCss;
        }
      } else {
        delete partialRepo.sourceJs;
        delete partialRepo.sourceCss;
      }
      return partialRepo;
    }));

    return { data: filteredRepos, total, page, limit };
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
    });
  }

  /**
   * Search Repos by dynamic criteria.
   *
   * @param specifications - The list of specifications to filter by.
   * @param userId - The ID of the user performing the search (can be null for guests).
   */
  public async searchRepos(specifications: RepoSpecification[], userId: string | null): Promise<PartialCodeRepo[]> {
    const compositeSpecification = new CompositeSpecification();
    specifications.forEach((spec) => compositeSpecification.add(spec));

    const query = kyselyDb.selectFrom("CodeRepo").selectAll();
    const filteredQuery = compositeSpecification.apply(query);

    if (userId) {
      for (const spec of specifications) {
        if (spec instanceof TagSpecification) {
          for (const tag of spec.tags) {
            await this.recordSearch(userId, tag);
          }
        }
      }

      const recentTags = await prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const recentTagNames = recentTags.map(tag => tag.tag);

      const prioritizedQuery = filteredQuery
        .orderBy(
          sql`CASE WHEN tags @> ARRAY[${recentTagNames.map(tag => `'${tag}'`).join(', ')}] THEN 1 ELSE 2 END`
        )
        .orderBy('createdAt', 'desc');

      const repos = await prioritizedQuery.execute();

      const filteredRepos = await Promise.all(repos.map(async (repo) => {
        const partialRepo: PartialCodeRepo = { ...repo } as PartialCodeRepo;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const hasAccess = repo.userId === userId || user?.role === 'ADMIN' || await this.hasPurchased(userId, repo.id);

        if (!hasAccess) {
          delete partialRepo.sourceJs;
          delete partialRepo.sourceCss;
        }
        return partialRepo;
      }));

      return filteredRepos;
    }

    const repos = await filteredQuery.execute();

    const filteredRepos = repos.map((repo) => {
      const partialRepo: PartialCodeRepo = { ...repo } as PartialCodeRepo;
      delete partialRepo.sourceJs;
      delete partialRepo.sourceCss;
      return partialRepo;
    });

    return filteredRepos;
  }

  /**
   * Retrieve Repos by user ID.
   *
   * @param userId - The user ID to filter by.
   */
  public async getReposByUser(userId: string): Promise<CodeRepo[]> {
    const query = kyselyDb.selectFrom("CodeRepo").selectAll().where("userId", "=", userId);
    return await query.execute();
  }

  /**
   * Retrieve all Repos without filtering by visibility.
   */
  public async getAllRepos(): Promise<CodeRepo[]> {
    return await prisma.codeRepo.findMany({
      include: {
        reviews: true,
        tags: true,
        orders: true,
      },
    });
  }
}

interface RepoSpecification {
  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any>;
}

export class VisibilitySpecification implements RepoSpecification {
  constructor(private visibility: string) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return query.where("visibility", "=", this.visibility);
  }
}

export class TagSpecification implements RepoSpecification {
  constructor(public tags: string[]) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    const eb = expressionBuilder(query);

    return query.where(eb.exists(
      eb.selectFrom("CodeRepoTag")
        .select("CodeRepoTag.tagId")
        .whereRef("CodeRepoTag.codeRepoId", "=", "CodeRepo.id")
        .where("CodeRepoTag.tagId", "in", this.tags)
    ));
  }
}

export class LanguageSpecification implements RepoSpecification {
  constructor(private language: string) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return query.where("language", "=", this.language);
  }
}

export class UserSpecification implements RepoSpecification {
  constructor(private userId: string) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return query.where("userId", "=", this.userId);
  }
}

export class SearchSpecification implements RepoSpecification {
  constructor(private query: string) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return query.where((eb) => eb.or([
      eb('name', 'ilike', `%${this.query}%`),
      eb('description', 'ilike', `%${this.query}%`),
    ]))
  }
}

export class CompositeSpecification implements RepoSpecification {
  private specifications: RepoSpecification[] = [];

  add(spec: RepoSpecification): void {
    this.specifications.push(spec);
  }

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    return this.specifications.reduce((acc, spec) => {
      return spec.apply(acc);
    }, query);
  }
}

