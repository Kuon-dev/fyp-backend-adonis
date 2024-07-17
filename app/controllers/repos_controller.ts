import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import { prisma } from '#services/prisma_service'
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import { z } from 'zod'
import { createRepoSchema, updateRepoSchema } from '#validators/repo'
import { Language, Visibility } from '@prisma/client'
import RepoService from '#services/repo_service'
import CodeCheckService from '#services/code_check_service'
import CodeRepoSearchService, { SearchCriteria } from '#services/repo_search_service'
import logger from '@adonisjs/core/services/logger'

const searchSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  language: z.nativeEnum(Language).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
})

/**
 * Controller class for handling Repo operations.
 */

@inject()
export default class RepoController {
  constructor(
    protected repoService: RepoService,
    protected codeCheckService: CodeCheckService,
    protected codeRepoSearchService: CodeRepoSearchService
  ) {}

  /**
   * Create a new Repo.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam data - The data for the new Repo.
   */
  public async create({ request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      const data = createRepoSchema.parse(request.body())

      const repo = await this.repoService.createRepo({
        userId: request.user.id,
        ...data,
        sourceJs: '',
        sourceCss: '',
        status: 'pending',
      })
      return response.status(201).json(repo)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.abort({ message: 'Validation error', errors: error.errors }, 400)
      }
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Retrieve a Repo by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the Repo.
   */
  public async getById({ params, request, response }: HttpContext) {
    const { id } = params

    try {
      const repo = await this.repoService.getRepoById(id, request.user?.id ?? null)
      const repoCodeCheck = await prisma.codeCheck.findFirst({
        where: {
          repoId: id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      return response.status(200).json({
        repo: repo,
        repoCodeCheck: repoCodeCheck ?? null,
      })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  public async getByIdPublic({ params, response }: HttpContext) {
    const { id } = params
    try {
      const repo = await this.repoService.getRepoByIdPublic(id)
      const repoCodeCheck = await prisma.codeCheck.findFirst({
        where: {
          repoId: id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      return response.status(200).json({
        repo: repo,
        repoCodeCheck: repoCodeCheck ?? null,
      })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Update a Repo.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the Repo.
   * @bodyParam data - The data to update the Repo.
   */
  public async update({ params, request, response }: HttpContext) {
    const { id } = params

    try {
      const data = updateRepoSchema.parse(request.body())

      const repo = await this.repoService.updateRepo(id, data)

      //if (data.sourceJs) {
      //  const language = data.language || 'JSX' // Default to JSX if not provided
      //  const cleanedSource = data.sourceJs.replace(
      //    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      //    ''
      //  )
        //const codeCheckResult = await this.codeCheckService.performCodeCheck(
        //  cleanedSource,
        //  language
        //)
        //
        //await prisma.codeCheck.create({
        //  data: {
        //    repoId: id,
        //    securityScore: codeCheckResult.securityScore,
        //    maintainabilityScore: codeCheckResult.maintainabilityScore,
        //    readabilityScore: codeCheckResult.readabilityScore,
        //    overallDescription: codeCheckResult.overallDescription,
        //    securitySuggestion: codeCheckResult.securitySuggestion,
        //    maintainabilitySuggestion: codeCheckResult.maintainabilitySuggestion,
        //    readabilitySuggestion: codeCheckResult.readabilitySuggestion,
        //
        //    eslintErrorCount: codeCheckResult.eslintErrorCount,
        //    eslintFatalErrorCount: codeCheckResult.eslintFatalErrorCount,
        //    //score: codeCheckResult.score,
        //    //message: codeCheckResult.suggestion,
        //    //description: codeCheckResult.description,
        //  },
        //})
      //}

      return response.status(200).json(repo)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.abort({ message: 'Validation error', errors: error.errors }, 400)
      }
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Delete a Repo by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the Repo.
   */
  public async delete({ request, params, response }: HttpContext) {
    const { id } = params
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      await this.repoService.deleteRepo(id)
      return response.status(200).json({ message: 'Repo deleted successfully' })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Retrieve paginated Repos with public visibility.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async getPaginated({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)

    try {
      const repos = await this.repoService.getPaginatedRepos(page, limit, request.user?.id ?? '')
      return response.status(200).json(repos)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Retrieve Repos by user ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam userId - The user ID to filter by.
   */
  public async getByUser({ params, response }: HttpContext) {
    const { userId } = params

    try {
      const repos = await this.repoService.getReposByUser(userId)
      return response.status(200).json(repos)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  public async getByUserSession({ request, response }: HttpContext) {
    if (!request.user) throw new Exception('User not found in request object')

    try {
      const repos = await this.repoService.getReposByUser(request.user.id)
      return response.status(200).json(repos)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Retrieve all Repos without filtering by visibility.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async getAll({ response }: HttpContext) {
    try {
      const repos = await this.repoService.getAllRepos()
      return response.status(200).json(repos)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Retrieve featured repos.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam limit - The number of featured repos to return (default: 5).
   */
  public async getFeatured({ request, response }: HttpContext) {
    const limit = request.input('limit', 5)

    try {
      const featuredRepos = await this.repoService.getFeaturedRepos(limit)
      return response.status(200).json(featuredRepos)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }

    /**
     * Get featured repos based on various criteria
     * @param {number} limit - The number of featured repos to return
     * @returns {Promise<CodeRepo[]>} - A list of featured repos
     */
  }

 /**
   * @searchRepos
   * @description Search for code repositories based on various criteria
   * @queryParam query - Search query for name and description
   * @queryParam tags - Array of tag names to filter by
   * @queryParam minPrice - Minimum price
   * @queryParam maxPrice - Maximum price
   * @queryParam language - Filter by programming language
   * @queryParam visibility - Filter by visibility (public/private)
   * @queryParam page - Page number for pagination
   * @queryParam pageSize - Number of items per page
   * @responseBody 200 - { 
   *   "data": [
   *     { "id": "...", "name": "...", "description": "...", "language": "...", "price": 0, "visibility": "..." }
   *   ],
   *   "meta": { "total": 0, "page": 1, "pageSize": 10, "lastPage": 1 }
   * }
   * @responseBody 400 - { "message": "Invalid search criteria" }
   */
  public async search({ request, response }: HttpContext) {
    try {
      const validatedData = searchSchema.parse(request.qs())
      logger.info({ validatedData }, 'Search criteria');
      
      const searchCriteria: SearchCriteria = {
        query: validatedData.query,
        tags: validatedData.tags,
        minPrice: validatedData.minPrice,
        maxPrice: validatedData.maxPrice,
        language: validatedData.language,
        visibility: validatedData.visibility,
      }

      const userId = request.user?.id

      const result = await this.codeRepoSearchService.search(
        searchCriteria,
        userId,
        validatedData.page,
        validatedData.pageSize
      )

      return response.ok(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.badRequest({ message: 'Invalid search criteria', errors: error.errors })
      }
      return response.internalServerError({ message: 'An error occurred while processing the search' })
    }
  }

}
