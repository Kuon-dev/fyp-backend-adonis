import type { HttpContext } from '@adonisjs/core/http'
import RepoService, {
  LanguageSpecification,
  SearchSpecification,
  TagSpecification,
  UserSpecification,
  VisibilitySpecification,
} from '#services/repo_service'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import CodeCheckService from '#services/code_check_service'
import { prisma } from '#services/prisma_service'
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import type { CodeRepo } from '@prisma/client'
import { z } from 'zod'
import { createRepoSchema, updateRepoSchema } from '#validators/repo'

/**
 * Controller class for handling Repo operations.
 */
@inject()
export default class RepoController {
  constructor(
    protected repoService: RepoService,
    protected codeCheckService: CodeCheckService
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

    console.log(request.user)
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
      console.log(id)
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

      if (data.sourceJs) {
        const language = data.language || 'JSX' // Default to JSX if not provided
        const cleanedSource = data.sourceJs.replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ''
        )
        const codeCheckResult = await this.codeCheckService.performCodeCheck(
          cleanedSource,
          language
        )

        await prisma.codeCheck.create({
          data: {
            repoId: id,
            securityScore: codeCheckResult.securityScore,
            maintainabilityScore: codeCheckResult.maintainabilityScore,
            readabilityScore: codeCheckResult.readabilityScore,
            overallDescription: codeCheckResult.overallDescription,
            securitySuggestion: codeCheckResult.securitySuggestion,
            maintainabilitySuggestion: codeCheckResult.maintainabilitySuggestion,
            readabilitySuggestion: codeCheckResult.readabilitySuggestion,

            eslintErrorCount: codeCheckResult.eslintErrorCount,
            eslintFatalErrorCount: codeCheckResult.eslintFatalErrorCount,
            //score: codeCheckResult.score,
            //message: codeCheckResult.suggestion,
            //description: codeCheckResult.description,
          },
        })
      }

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
   * Search Repos by dynamic criteria.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam tags - Optional tags filter.
   * @queryParam language - Optional language filter.
   * @queryParam userId - Optional user ID filter.
   * @queryParam query - Optional search query for title and description.
   */
  public async search({ request, response }: HttpContext) {
    // const visibility = request.input('visibility');
    const tags = request.input('tags')
    const language = request.input('language')
    const userId = request.input('userId')
    const query = request.input('query')

    const specifications = []

    // force public visibility for all users except admin and mods
    specifications.push(new VisibilitySpecification('public'))
    if (tags) specifications.push(new TagSpecification(tags))
    if (language) specifications.push(new LanguageSpecification(language))
    if (userId) specifications.push(new UserSpecification(userId))
    if (query) specifications.push(new SearchSpecification(query))

    try {
      const repos = await this.repoService.searchRepos(specifications, request.user?.id ?? null)
      return response.status(200).json(repos)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Search Repos by dynamic criteria.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam visibility - Optional visibility filter.
   * @queryParam tags - Optional tags filter.
   * @queryParam language - Optional language filter.
   * @queryParam userId - Optional user ID filter.
   * @queryParam query - Optional search query for title and description.
   */
  public async searchElevated({ request, response }: HttpContext) {
    const visibility = request.input('visibility')
    const tags = request.input('tags')
    const language = request.input('language')
    const userId = request.input('userId')
    const query = request.input('query')

    const specifications = []

    // force public visibility for all users except admin and mods
    if (visibility) specifications.push(new VisibilitySpecification(visibility))
    if (tags) specifications.push(new TagSpecification(tags))
    if (language) specifications.push(new LanguageSpecification(language))
    if (userId) specifications.push(new UserSpecification(userId))
    if (query) specifications.push(new SearchSpecification(query))

    try {
      const repos = await this.repoService.searchRepos(specifications, request.user?.id ?? null)
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
    console.log(request.user)
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

}
