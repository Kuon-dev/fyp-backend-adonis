
import type { HttpContext } from '@adonisjs/core/http';
import { OrderService } from '#services/order_service';
import { inject } from '@adonisjs/core';
import { Exception } from '@adonisjs/core/exceptions';
import { CreateOrderSchema, UpdateOrderSchema } from '#validators/order';
// import { CreateOrderSchema, UpdateOrderSchema } from '#schemas/order_schema';

/**
 * Controller class for handling Order operations.
 */
@inject()
export default class OrderController {
  constructor(protected orderService: OrderService) {}

  /**
   * Create a new Order.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam data - The data for the new Order.
   */
  public async create({ request, response }: HttpContext) {
    const data = request.only(['userId', 'codeRepoId', 'totalAmount']);

    const validation = CreateOrderSchema.safeParse(data);
    if (!validation.success) {
      return response.status(400).json({ message: 'Validation failed', errors: validation.error.errors });
    }

    try {
      const order = await this.orderService.createOrder(validation.data);
      return response.status(201).json(order);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve a paginated list of all Orders.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async getAll({ request, response }: HttpContext) {
    const page = request.input('page', 1);
    const limit = request.input('limit', 10);

    try {
      const { orders, total } = await this.orderService.getAllOrders(page, limit);
      return response.status(200).json({ orders, total });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve an Order by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the Order.
   */
  public async getById({ params, response }: HttpContext) {
    const { id } = params;

    try {
      const order = await this.orderService.getOrderById(id);
      return response.status(200).json(order);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve a paginated list of Orders by User.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam userId - The user ID.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async getByUser({ params, request, response }: HttpContext) {
    const { userId } = params;
    const page = request.input('page', 1);
    const limit = request.input('limit', 10);

    try {
      const { orders, total } = await this.orderService.getOrdersByUser(userId, page, limit);
      return response.status(200).json({ orders, total });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Update an Order by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the Order.
   * @bodyParam data - The data to update the Order.
   */
  public async update({ params, request, response }: HttpContext) {
    const { id } = params;
    const data = request.only(['status', 'totalAmount']);

    const validation = UpdateOrderSchema.safeParse(data);
    if (!validation.success) {
      return response.status(400).json({ message: 'Validation failed', errors: validation.error.errors });
    }

    try {
      const order = await this.orderService.updateOrder(id, validation.data);
      return response.status(200).json(order);
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Soft delete an Order by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the Order.
   */
  public async delete({ params, response }: HttpContext) {
    const { id } = params;

    try {
      const order = await this.orderService.deleteOrder(id);
      return response.status(200).json({ message: 'Order deleted successfully', order });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve a paginated list of Orders by status.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam status - The status of the Orders.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async getByStatus({ params, request, response }: HttpContext) {
    const { status } = params;
    const page = request.input('page', 1);
    const limit = request.input('limit', 10);

    try {
      const { orders, total } = await this.orderService.getOrdersByStatus(status, page, limit);
      return response.status(200).json({ orders, total });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Retrieve a paginated list of Orders for a specific user filtered by status.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam userId - The user ID.
   * @paramParam status - The status of the Orders.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async getUserOrdersByStatus({ params, request, response }: HttpContext) {
    const { userId, status } = params;
    const page = request.input('page', 1);
    const limit = request.input('limit', 10);

    try {
      const { orders, total } = await this.orderService.getUserOrdersByStatus(userId, status, page, limit);
      return response.status(200).json({ orders, total });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * Search orders based on various criteria.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam userId - The user ID.
   * @queryParam status - The order status.
   * @queryParam fromDate - The start date for the search range.
   * @queryParam toDate - The end date for the search range.
   * @queryParam minAmount - The minimum total amount for the search.
   * @queryParam maxAmount - The maximum total amount for the search.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async searchOrders({ request, response }: HttpContext) {
    const criteria = request.only(['userId', 'status', 'fromDate', 'toDate', 'minAmount', 'maxAmount']);
    const page = request.input('page', 1);
    const limit = request.input('limit', 10);

    try {
      const { orders, total } = await this.orderService.searchOrders(criteria, page, limit);
      return response.status(200).json({ orders, total });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }
}

