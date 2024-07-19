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
import RepoAccessService from '#services/repo_access_service'

const searchSchema = z.object({
  query: z.string().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : undefined)),
  minPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().min(0).optional()),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().min(0).optional()),
  language: z.nativeEnum(Language).optional(),
  page: z
    .string()
    .default('1')
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().min(1).optional()),
  pageSize: z
    .string()
    .default('10')
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().min(1).optional()),
})

@inject()
export default class RepoController {
  constructor(
    protected repoService: RepoService,
    protected codeRepoSearchService: CodeRepoSearchService,
    protected repoAccessService: RepoAccessService,
    protected codeCheckService: CodeCheckService
  ) {}

  /**
   * Create a new Repo.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam {Object} data - The data for the new Repo.
   * @responseBody 201 - { id: string, name: string, ... } - The created repo
   * @responseBody 400 - { message: string, errors?: Object[] } - Validation error details
   * @responseBody 401 - { message: string } - Unauthorized error
   */
  public async create({ request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not authenticated')

    try {
      const data = createRepoSchema.parse(request.body())

      const repo = await this.repoService.createRepo({
        userId: request.user.id,
        ...data,
        sourceJs: '',
        sourceCss: '',
        status: 'pending',
      })
      return response.created(repo)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.badRequest({ message: 'Validation error', errors: error.errors })
      }
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * Retrieve a Repo by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam {string} id - The ID of the Repo.
   * @responseBody 200 - { repo: Object, repoCodeCheck: Object|null, hasAccess: boolean }
   * @responseBody 401 - { message: string } - Unauthorized error
   * @responseBody 403 - { message: string } - Forbidden error
   * @responseBody 404 - { message: string } - Not found error
   * @responseBody 500 - { message: string } - Internal server error
   */
  public async getById({ params, request, response }: HttpContext) {
    const user = request.user
    if (!user) throw new UnAuthorizedException('User not found in request object')
    const { id } = params

    try {
      return await prisma.$transaction(async (tx) => {
        const repo = await this.repoService.getRepoById(id, user.id)

        if (!repo) {
          return response.notFound({ message: 'Repo not found' })
        }

        const hasAccess = await this.repoAccessService.hasAccess(user.id, id, tx)

        if (repo.visibility === 'private' && !hasAccess && repo.userId !== user.id) {
          return response.forbidden({ message: 'You do not have access to this repo' })
        }

        const repoCodeCheck = await tx.codeCheck.findFirst({
          where: {
            repoId: id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        const repoDetails =
          repo.visibility === 'private' && !hasAccess && repo.userId !== user.id
            ? { id: repo.id, name: repo.name, visibility: repo.visibility }
            : repo

        return response.ok({
          repo: repoDetails,
          repoCodeCheck: repoCodeCheck ?? null,
          hasAccess: hasAccess || repo.userId === user.id,
        })
      })
    } catch (error) {
      console.error('Error retrieving repo:', error)
      return response.internalServerError({
        message: 'An error occurred while retrieving the repo',
      })
    }
  }

  /**
   * Retrieve a public Repo by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam {string} id - The ID of the Repo.
   * @responseBody 200 - { repo: Object, repoCodeCheck: Object|null }
   * @responseBody 400 - { message: string } - Bad request error
   */
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
   * @paramParam {string} id - The ID of the Repo.
   * @bodyParam {Object} data - The data to update the Repo.
   * @responseBody 200 - { id: string, name: string, ... } - The updated repo
   * @responseBody 400 - { message: string, errors?: Object[] } - Validation error details
   * @responseBody 401 - { message: string } - Unauthorized error
   * @responseBody 403 - { message: string } - Forbidden error
   * @responseBody 404 - { message: string } - Not found error
   */
  public async update({ params, request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not authenticated')
    const { id } = params

    try {
      const data = updateRepoSchema.parse(request.body())

      const repo = await this.repoService.getRepoById(id, request.user.id)
      if (!repo) {
        return response.notFound({ message: 'Repo not found' })
      }
      if (repo.userId !== request.user.id) {
        return response.forbidden({ message: 'You do not have permission to update this repo' })
      }

      const updatedRepo = await this.repoService.updateRepo(id, data)
      return response.ok(updatedRepo)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.badRequest({ message: 'Validation error', errors: error.errors })
      }
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * Delete a Repo by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam {string} id - The ID of the Repo to delete.
   * @responseBody 200 - { message: string } - Success message
   * @responseBody 400 - { message: string } - Bad request error
   * @responseBody 401 - { message: string } - Unauthorized error
   * @responseBody 403 - { message: string } - Forbidden error
   * @responseBody 404 - { message: string } - Not found error
   */
  public async delete({ request, params, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not authenticated')
    const { id } = params

    try {
      const repo = await this.repoService.getRepoById(id, request.user.id)
      if (!repo) {
        return response.notFound({ message: 'Repo not found' })
      }
      if (repo.userId !== request.user.id) {
        return response.forbidden({ message: 'You do not have permission to delete this repo' })
      }

      await this.repoService.deleteRepo(id)
      return response.ok({ message: 'Repo deleted successfully' })
    } catch (error) {
      console.log(error)
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * Retrieve Repos by user ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam {string} userId - The user ID to filter by.
   * @responseBody 200 - Array of repo objects
   * @responseBody 400 - { message: string } - Bad request error
   * @responseBody 401 - { message: string } - Unauthorized error
   * @responseBody 403 - { message: string } - Forbidden error
   */
  public async getByUser({ params, request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not authenticated')
    const { userId } = params

    if (userId !== request.user.id && request.user.role !== 'ADMIN') {
      return response.forbidden({ message: 'You do not have permission to view these repos' })
    }

    try {
      const repos = await this.repoService.getReposByUser(userId)
      return response.ok(repos)
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * Retrieve Repos for the authenticated user.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @responseBody 200 - Array of repo objects
   * @responseBody 400 - { message: string } - Bad request error
   * @responseBody 401 - { message: string } - Unauthorized error
   */
  public async getByUserSession({ request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not authenticated')

    try {
      const repos = await this.repoService.getReposByUser(request.user.id)
      return response.ok(repos)
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * Retrieve featured repos.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam {number} [limit=5] - The number of featured repos to return.
   * @responseBody 200 - Array of featured repo objects
   * @responseBody 400 - { message: string } - Bad request error
   */
  public async getFeatured({ request, response }: HttpContext) {
    const limit = request.input('limit', 5)

    try {
      const featuredRepos = await this.repoService.getFeaturedRepos(limit)
      return response.ok(featuredRepos)
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * Search for code repositories based on various criteria.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam {string} [query] - Search query for name and description
   * @queryParam {string|string[]} [tags] - Array of tag names to filter by
   * @queryParam {number} [minPrice] - Minimum price
   * @queryParam {number} [maxPrice] - Maximum price
   * @queryParam {Language} [language] - Filter by programming language
   * @queryParam {number} [page=1] - Page number for pagination
   * @queryParam {number} [pageSize=10] - Number of items per page
   * @responseBody 200 - { data: Array<Object>, meta: { total: number, page: number, pageSize: number, lastPage: number } }
   * @responseBody 400 - { message: string, errors?: Object[] } - Bad request or validation error
   * @responseBody 500 - { message: string } - Internal server error
   */
  public async search({ request, response }: HttpContext) {
    try {
      const validatedData = searchSchema.parse(request.qs())

      const searchCriteria: SearchCriteria = {
        query: validatedData.query,
        tags: validatedData.tags,
        minPrice: validatedData.minPrice,
        maxPrice: validatedData.maxPrice,
        language: validatedData.language,
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
      return response.internalServerError({
        message: 'An error occurred while processing the search',
      })
    }
  }
}
