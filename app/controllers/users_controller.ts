import type { HttpContext } from '@adonisjs/core/http';
// import UserService from '#services/user_service';
import { inject } from '@adonisjs/core';
// import { Exception } from '@adonisjs/core/exceptions';
import { UserService } from '#services/user_service';


/**
 * Controller class for handling User operations.
 */
@inject()
export default class UserController {
  constructor(protected userService: UserService) {}

  /**
   * Create a new User.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam data - The data for the new User.
   */
  public async create({ request, response }: HttpContext) {
    const data = request.only(['email', 'password', 'fullname', 'role']);

    try {
      const user = await this.userService.createUser(data);
      return response.status(201).json(user);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve a User by email.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam email - The email of the User.
   */
  public async getByEmail({ params, response }: HttpContext) {
    const { email } = params;

    try {
      const user = await this.userService.getUserByEmail(email);
      return response.status(200).json(user);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Update a User.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam email - The email of the User.
   * @bodyParam data - The data to update the User.
   */
  public async update({ params, request, response }: HttpContext) {
    const { email } = params;
    const data = request.only(['email', 'password', 'fullname', 'role']);

    try {
      const user = await this.userService.updateUser(email, data);
      return response.status(200).json(user);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Delete a User by email (soft delete).
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam email - The email of the User.
   */
  public async delete({ params, response }: HttpContext) {
    const { email } = params;

    try {
      const user = await this.userService.deleteUser(email);
      return response.status(200).json({ message: 'User deleted successfully', user });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve all Users.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async getAll({ response }: HttpContext) {
    try {
      const users = await this.userService.getAllUsers();
      return response.status(200).json(users);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve paginated Users.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async getPaginated({ request, response }: HttpContext) {
    const page = request.input('page', 1);
    const limit = request.input('limit', 10);

    try {
      const { users, total } = await this.userService.getPaginatedUsers(page, limit);
      return response.status(200).json({ users, total });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Update a User's profile.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam email - The email of the User.
   * @bodyParam data - The profile data to update.
   */
  public async updateProfile({ params, request, response }: HttpContext) {
    const { email } = params;
    const data = request.only(['fullname', 'businessName', 'businessAddress', 'businessPhone', 'businessEmail']);

    try {
      const user = await this.userService.updateUserProfile(email, data);
      return response.status(200).json(user);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }
}

