// import { SelectQueryBuilder, ExpressionBuilder, expressionBuilder } from "kysely";
import { SelectQueryBuilder, expressionBuilder } from "kysely";
import type { CodeRepo, Language, CodeRepoStatus } from "@prisma/client";
import { kyselyDb } from "#database/kysely";
import { prisma } from "./prisma_service.js";
import env from "#start/env";
import Stripe from "stripe";
import logger from '@adonisjs/core/services/logger'

const stripe = new Stripe(env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-04-10',
});

/**
 * Service class for handling Repo operations.
 */
export default class RepoService {
  /**
   * Create a new Repo.
   *
   * @param data - The data to create a new Repo.
   */
  public async createRepo(data: Omit<CodeRepo, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'stripeProductId' | 'stripePriceId'>) {
    logger.info(data)
    const repo = await prisma.codeRepo.create({
      data,
    });

    const product = await stripe.products.create({
      name: data.name,
      description: data.description || undefined,
    });

    // Create a price in Stripe
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: data.price * 100, // converting to cents
      currency: 'usd',
    });

    console.log("Product created: ", product);
    console.log("Price created: ", price);

    return repo
  }

  /**
   * Retrieve a Repo by ID.
   *
   * @param id - The ID of the Repo.
   */
  public async getRepoById(id: string) {
    return await prisma.codeRepo.findUnique({
      where: { id },
      include: {
        reviews: true,
        tags: true,
        orders: true,
      },
    });
  }

  /**
   * Update a Repo.
   *
   * @param id - The ID of the Repo.
   * @param data - The data to update the Repo.
   */
  public async updateRepo(id: string, data: Partial<CodeRepo>) {
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
  public async deleteRepo(id: string) {
    return await prisma.codeRepo.delete({
      where: { id },
    });
  }

  /**
   * Retrieve paginated Repos with public visibility.
   *
   * @param page - The page number for pagination.
   * @param limit - The number of items per page.
   */
  public async getPaginatedRepos(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const repos = await prisma.codeRepo.findMany({
      skip: offset,
      take: limit,
      where: {
        visibility: 'public',
      },
    });
    const total = await prisma.codeRepo.count({
      where: {
        visibility: 'public',
      },
    });
    return { repos, total, page, limit };
  }

  /**
   * Search Repos by dynamic criteria.
   *
   * @param specifications - The list of specifications to filter by.
   */
  public async searchRepos(specifications: RepoSpecification[]) {
    const compositeSpecification = new CompositeSpecification();
    specifications.forEach((spec) => compositeSpecification.add(spec));

    const query = kyselyDb.selectFrom("CodeRepo").selectAll();
    const filteredQuery = compositeSpecification.apply(query);

    return await filteredQuery.execute();
  }

  /**
   * Retrieve Repos by user ID.
   *
   * @param userId - The user ID to filter by.
   */
  public async getReposByUser(userId: string) {
    const query = kyselyDb.selectFrom("CodeRepo").selectAll().where("userId", "=", userId);
    return await query.execute();
  }

  /**
   * Retrieve all Repos without filtering by visibility.
   */
  public async getAllRepos() {
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
  constructor(private tags: string[]) {}

  apply(query: SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
    const eb = expressionBuilder(query);

    return query.where(eb.exists(
      eb.selectFrom("RepoTags")
        .select("RepoTags.tagId")
        .whereRef("RepoTags.repoId", "=", "CodeRepo.id")
        .where("RepoTags.name", 'in', this.tags)
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

  apply(query : SelectQueryBuilder<any, any, any>): SelectQueryBuilder<any, any, any> {
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

