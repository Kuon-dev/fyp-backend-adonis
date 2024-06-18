import type { HttpContext } from '@adonisjs/core/http'
import RepoService, { LanguageSpecification, SearchSpecification, TagSpecification, UserSpecification, VisibilitySpecification } from '#services/repo_service';
import { inject } from '@adonisjs/core';
import { Exception } from '@adonisjs/core/exceptions';

/**
 * Controller class for handling Repo operations.
 */
@inject()
export default class RepoController {
  constructor(protected repoService: RepoService) {}

  /**
   * Create a new Repo.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam data - The data for the new Repo.
   */
  public async create({ request, response }: HttpContext) {
    const data = request.only([
      'name', 'description', 'language', 'price', 'tags', 'visibility'
    ]);

    if (!request.user) throw new Exception('User not found in request object');

    try {
      const repo = await this.repoService.createRepo({
        userId: request.user?.id ?? 'mfql4vlvth56cxyku6qvztsivhsyrre7ousijpvks4dbyhi2tqjq',  // The user ID is retrieved from the request object
        ...data,
        sourceJs: '',
        sourceCss: '',
        status: 'pending',  // Default status, can be adjusted as needed
      });
      return response.status(201).json(repo);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Retrieve a Repo by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the Repo.
   */
  public async getById({ params, request, response }: HttpContext) {
    const { id } = params;

    try {
      const repo = await this.repoService.getRepoById(id, request.user?.id ?? null);
      return response.status(200).json(repo);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
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
    const { id } = params;
    const data = request.only([
      'sourceJs', 'sourceCss', 'name', 'description', 'language', 'price', 'tags', 'visibility', 'status'
    ]);

    try {
      const repo = await this.repoService.updateRepo(id, data);
      return response.status(200).json(repo);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Delete a Repo by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the Repo.
   */
  public async delete({ params, response }: HttpContext) {
    const { id } = params;

    try {
      await this.repoService.deleteRepo(id);
      return response.status(200).json({ message: 'Repo deleted successfully' });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
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
    const page = request.input('page', 1);
    const limit = request.input('limit', 10);

    try {
      const repos = await this.repoService.getPaginatedRepos(page, limit);
      return response.status(200).json(repos);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
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
  public async search({ request, response }: HttpContext) {
    const visibility = request.input('visibility');
    const tags = request.input('tags');
    const language = request.input('language');
    const userId = request.input('userId');
    const query = request.input('query');

    const specifications = [];

    if (visibility) specifications.push(new VisibilitySpecification(visibility));
    if (tags) specifications.push(new TagSpecification(tags));
    if (language) specifications.push(new LanguageSpecification(language));
    if (userId) specifications.push(new UserSpecification(userId));
    if (query) specifications.push(new SearchSpecification(query));

    try {
      const repos = await this.repoService.searchRepos(specifications, request.user?.id ?? null);
      return response.status(200).json(repos);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Retrieve Repos by user ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam userId - The user ID to filter by.
   */
  public async getByUser({ params, response }: HttpContext) {
    const { userId } = params;

    try {
      const repos = await this.repoService.getReposByUser(userId);
      return response.status(200).json(repos);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  public async getByUserSession({ request, response }: HttpContext) {
    console.log(request.user)
    if (!request.user) throw new Exception('User not found in request object');

    try {
      const repos = await this.repoService.getReposByUser(request.user.id);
      return response.status(200).json(repos);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  };

  /**
   * Retrieve all Repos without filtering by visibility.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async getAll({ response }: HttpContext) {
    try {
      const repos = await this.repoService.getAllRepos();
      return response.status(200).json(repos);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }
}

