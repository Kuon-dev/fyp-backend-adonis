import { Kysely, sql, ExpressionBuilder, SelectQueryBuilder } from 'kysely';
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

export class CodeRepoSearchBuilder {
  private db: Kysely<DB>;
  private searchCriteria: SearchCriteria;
  private query: SelectQueryBuilder<DB, 'CodeRepo', any>;
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
        'CodeRepo.visibility'
      ])
      .distinct();
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
      await this.db.insertInto('SearchHistory')
        .values({
          id: sql`uuid_generate_v4()`,
          userId: this.userId,
          tag: this.searchCriteria.query,
          createdAt: new Date()
        })
        .execute();
    } catch (error) {
      logger.error({ error }, 'Error saving search history');
    }
  }

  build(): SelectQueryBuilder<DB, 'CodeRepo', any> {
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
      .withVisibility(criteria.visibility)
      .withUserId(userId);

    try {
      const query = builder.build();
      const queryCount = builder.build();
      
      logger.info({ query: query.compile().sql, bindings: query.compile().parameters }, 'Built query');

      const totalCountQuery = queryCount.clearSelect().select(sql`count(distinct "CodeRepo"."id")`.as('count'));
      const resultsQuery = query.limit(pageSize).offset(offset);

      logger.info({ 
        countSQL: totalCountQuery.compile().sql,
        countBindings: totalCountQuery.compile().parameters,
        resultsSQL: resultsQuery.compile().sql,
        resultsBindings: resultsQuery.compile().parameters
      }, 'Generated SQL queries');

      const [totalCountResult, results] = await Promise.all([
        totalCountQuery.execute(),
        resultsQuery.execute(),
      ]);

      logger.info({ totalCountResult, results }, 'Query results');

      const total = Number(totalCountResult[0]?.count || 0);

      logger.info({ total, resultCount: results.length }, 'Search results');

      return {
        data: results,
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
