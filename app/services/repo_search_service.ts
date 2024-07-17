import { Kysely, sql, SelectQueryBuilder, Expression, SqlBool } from 'kysely';
import { Language, Visibility } from '@prisma/client';
import { DB } from '#database/kysely/types';
import { kyselyDb } from '#database/kysely';
import logger from '@adonisjs/core/services/logger'

export interface SearchCriteria {
  query?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  language?: Language;
  visibility?: Visibility;
}

interface CodeRepoSearchResult {
  id: string;
  name: string;
  description: string | null;
  language: Language;
  price: number;
  visibility: Visibility;
  tags: string[];
  createdAt: Date;
}

type CodeRepoSearchQuery = SelectQueryBuilder<DB, 'CodeRepo' | 'TagsOnRepos' | 'Tag', any>;

export class CodeRepoSearchBuilder {
  private db: Kysely<DB>;
  private searchCriteria: SearchCriteria;
  private query: CodeRepoSearchQuery;
  private userId?: string;

  constructor(db: Kysely<DB>) {
    this.db = db;
    this.searchCriteria = {};
    this.query = this.db.selectFrom('CodeRepo')
      .leftJoin('TagsOnRepos', 'CodeRepo.id', 'TagsOnRepos.codeRepoId')
      .leftJoin('Tag', 'TagsOnRepos.tagId', 'Tag.id')
      .select([
        'CodeRepo.id',
        'CodeRepo.name',
        'CodeRepo.description',
        'CodeRepo.language',
        'CodeRepo.price',
        'CodeRepo.visibility',
        'CodeRepo.createdAt', 
        sql<string[]>`array_agg(DISTINCT "Tag"."name")`.as('tags')
      ])
      .groupBy([
        'CodeRepo.id',
        'CodeRepo.name',
        'CodeRepo.description',
        'CodeRepo.language',
        'CodeRepo.price',
        'CodeRepo.visibility'
      ]);
  }

  withQuery(query?: string): this {
    if (query) {
      this.searchCriteria.query = query;
      const searchTerms = query.split(' ').filter(term => term.length > 0);
      this.query = this.query.where(eb => {
        const conditions = searchTerms.map(term => 
          eb.or([
            eb('CodeRepo.name', 'ilike', `%${term}%`),
            eb('CodeRepo.description', 'ilike', `%${term}%`)
          ])
        );
        return eb.and(conditions);
      });
    }
    return this;
  }

  withTags(tags?: string[]): this {
    if (tags && tags.length > 0) {
      this.searchCriteria.tags = tags;
      this.query = this.query.where('Tag.name', 'in', tags);
    }
    return this;
  }

  withPriceRange(minPrice?: number, maxPrice?: number): this {
    if (minPrice !== undefined) {
      this.searchCriteria.minPrice = minPrice;
      this.query = this.query.where('CodeRepo.price', '>=', minPrice);
    }
    if (maxPrice !== undefined) {
      this.searchCriteria.maxPrice = maxPrice;
      this.query = this.query.where('CodeRepo.price', '<=', maxPrice);
    }
    return this;
  }

  withLanguage(language?: Language): this {
    if (language) {
      this.searchCriteria.language = language;
      this.query = this.query.where('CodeRepo.language', '=', language);
    }
    return this;
  }

  withVisibility(visibility?: Visibility): this {
    if (visibility) {
      this.searchCriteria.visibility = visibility;
      this.query = this.query.where('CodeRepo.visibility', '=', visibility);
    }
    return this;
  }

  withUserId(userId?: string): this {
    if (userId) this.userId = userId;
    return this;
  }

  private async saveSearchHistory(): Promise<void> {
    if (!this.userId || !this.searchCriteria.query) {
      return;
    }

    try {
      const test = new Date();
      await this.db.insertInto('SearchHistory')
        .values({
          id: sql`uuid_generate_v4()`,
          userId: this.userId,
          tag: this.searchCriteria.query,
          createdAt: test,
      })
        .execute();
    } catch (error) {
      logger.error({ error }, 'Error saving search history');
    }
  }

  build(): CodeRepoSearchQuery {
    this.saveSearchHistory().catch(error => {
      logger.error({ error }, 'Error saving search history');
    });

    logger.info({ sql: this.query.compile().sql, bindings: this.query.compile().parameters }, 'Generated SQL query');

    return this.query;
  }
}

export default class CodeRepoSearchService {
  private db: Kysely<DB>;

  constructor() {
    this.db = kyselyDb;
  }

  async search(criteria: SearchCriteria, userId?: string, page: number = 1, pageSize: number = 10) {
    const offset = (page - 1) * pageSize;

    logger.info({ criteria, userId, page, pageSize }, 'Search method called with parameters');

    const builder = new CodeRepoSearchBuilder(this.db)
      .withQuery(criteria.query)
      .withTags(criteria.tags)
      .withPriceRange(criteria.minPrice, criteria.maxPrice)
      .withLanguage(criteria.language)
      .withVisibility('public' as Visibility)
      .withUserId(userId);

    try {
      const query = builder.build();
      
      logger.info({ query: query.compile().sql, bindings: query.compile().parameters }, 'Built query');

      // Create a separate count query without GROUP BY
      const countQuery = this.db.selectFrom('CodeRepo')
        .leftJoin('TagsOnRepos', 'CodeRepo.id', 'TagsOnRepos.codeRepoId')
        .leftJoin('Tag', 'TagsOnRepos.tagId', 'Tag.id')
        .select(sql<number>`count(distinct "CodeRepo"."id")`.as('count'))
        .where((eb) => {
          const conditions: Expression<SqlBool>[] = [];

          if (criteria.tags && criteria.tags.length > 0) {
            conditions.push(eb('Tag.name', 'in', criteria.tags));
          }
          if (criteria.query) {
            const searchTerms = criteria.query.split(' ').filter(term => term.length > 0);
            const searchConditions = searchTerms.map(term => 
              eb.or([
                eb('CodeRepo.name', 'ilike', `%${term}%`),
                eb('CodeRepo.description', 'ilike', `%${term}%`)
              ])
            );
            conditions.push(eb.and(searchConditions));
          }
          if (criteria.minPrice !== undefined) {
            conditions.push(eb('CodeRepo.price', '>=', criteria.minPrice));
          }
          if (criteria.maxPrice !== undefined) {
            conditions.push(eb('CodeRepo.price', '<=', criteria.maxPrice));
          }
          if (criteria.language) {
            conditions.push(eb('CodeRepo.language', '=', criteria.language));
          }
          conditions.push(eb('CodeRepo.visibility', '=', 'public' as Visibility));

          return eb.and(conditions);
        });

      const resultsQuery = query.limit(pageSize).offset(offset);

      logger.info({ 
        countSQL: countQuery.compile().sql,
        countBindings: countQuery.compile().parameters,
        resultsSQL: resultsQuery.compile().sql,
        resultsBindings: resultsQuery.compile().parameters
      }, 'Generated SQL queries');

      const [totalCountResult, results] = await Promise.all([
        countQuery.executeTakeFirst(),
        resultsQuery.execute() as Promise<CodeRepoSearchResult[]>,
      ]);

      logger.info({ totalCountResult, results }, 'Query results');

      const total = Number(totalCountResult?.count || 0);

      // Process the results to format tags
      const formattedResults = results.map(repo => ({
        ...repo,
        tags: repo.tags?.filter(Boolean) || [] // Remove null values and ensure it's an array
      }));

      logger.info({ total, resultCount: formattedResults.length }, 'Search results');

      return {
        data: formattedResults,
        meta: {
          total,
          page,
          pageSize,
          lastPage: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      logger.error({ error, stack: error.stack }, 'Error executing search query');
      throw new Error('An error occurred while executing the search query');
    }
  }
}