import type { HttpContext } from '@adonisjs/core/http';
import { OrderService } from '#services/order_service';
import { inject } from '@adonisjs/core';
import { CreateOrderSchema, UpdateOrderSchema } from '#validators/order';

@inject()
export default class OrderController {
  constructor(protected orderService: OrderService) {}

  /**
   * @checkCode
   * @description Create a new order.
   * @requestBody {
   *   "userId": "string",
   *   "codeRepoId": "string",
   *   "totalAmount": number
   * }
   * @responseBody 201 - {
   *   "id": "string",
   *   "userId": "string",
   *   "codeRepoId": "string",
   *   "totalAmount": number,
   *   "status": "string",
   *   "createdAt": "string",
   *   "updatedAt": "string"
   * }
   * @responseBody 400 - { "message": "Validation failed", "errors": [] }
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
   * @checkCode
   * @description Retrieve a paginated list of all orders.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   * @responseBody 200 - {
   *   "orders": [
   *     {
   *       "id": "string",
   *       "userId": "string",
   *       "codeRepoId": "string",
   *       "totalAmount": number,
   *       "status": "string",
   *       "createdAt": "string",
   *       "updatedAt": "string"
   *     }
   *   ],
   *   "total": number
   * }
   * @responseBody 400 - { "message": "Error message" }
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
   * @checkCode
   * @description Retrieve an order by its ID.
   * @paramParam id - The ID of the order.
   * @responseBody 200 - {
   *   "id": "string",
   *   "userId": "string",
   *   "codeRepoId": "string",
   *   "totalAmount": number,
   *   "status": "string",
   *   "createdAt": "string",
   *   "updatedAt": "string"
   * }
   * @responseBody 400 - { "message": "Error message" }
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
   * @checkCode
   * @description Retrieve a paginated list of orders for a specific user.
   * @paramParam userId - The user ID.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   * @responseBody 200 - {
   *   "orders": [
   *     {
   *       "id": "string",
   *       "userId": "string",
   *       "codeRepoId": "string",
   *       "totalAmount": number,
   *       "status": "string",
   *       "createdAt": "string",
   *       "updatedAt": "string"
   *     }
   *   ],
   *   "total": number
   * }
   * @responseBody 400 - { "message": "Error message" }
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
   * @checkCode
   * @description Update an order by its ID.
   * @paramParam id - The ID of the order.
   * @requestBody {
   *   "status": "string",
   *   "totalAmount": number
   * }
   * @responseBody 200 - {
   *   "id": "string",
   *   "userId": "string",
   *   "codeRepoId": "string",
   *   "totalAmount": number,
   *   "status": "string",
   *   "createdAt": "string",
   *   "updatedAt": "string"
   * }
   * @responseBody 400 - { "message": "Validation failed", "errors": [] }
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
   * @checkCode
   * @description Soft delete an order by its ID.
   * @paramParam id - The ID of the order.
   * @responseBody 200 - { "message": "Order deleted successfully", "order": {} }
   * @responseBody 400 - { "message": "Error message" }
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
   * @checkCode
   * @description Retrieve a paginated list of orders filtered by status.
   * @paramParam status - The status of the orders.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   * @responseBody 200 - {
   *   "orders": [
   *     {
   *       "id": "string",
   *       "userId": "string",
   *       "codeRepoId": "string",
   *       "totalAmount": number,
   *       "status": "string",
   *       "createdAt": "string",
   *       "updatedAt": "string"
   *     }
   *   ],
   *   "total": number
   * }
   * @responseBody 400 - { "message": "Error message" }
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
   * @checkCode
   * @description Retrieve a paginated list of orders for a specific user filtered by status.
   * @paramParam userId - The user ID.
   * @paramParam status - The status of the orders.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   * @responseBody 200 - {
   *   "orders": [
   *     {
   *       "id": "string",
   *       "userId": "string",
   *       "codeRepoId": "string",
   *       "totalAmount": number,
   *       "status": "string",
   *       "createdAt": "string",
   *       "updatedAt": "string"
   *     }
   *   ],
   *   "total": number
   * }
   * @responseBody 400 - { "message": "Error message" }
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
   * @checkCode
   * @description Search orders based on various criteria.
   * @queryParam userId - The user ID.
   * @queryParam status - The order status.
   * @queryParam fromDate - The start date for the search range.
   * @queryParam toDate - The end date for the search range.
   * @queryParam minAmount - The minimum total amount for the search.
   * @queryParam maxAmount - The maximum total amount for the search.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   * @responseBody 200 - {
   *   "orders": [
   *     {
   *       "id": "string",
   *       "userId": "string",
   *       "codeRepoId": "string",
   *       "totalAmount": number,
   *       "status": "string",
   *       "createdAt": "string",
   *       "updatedAt": "string"
   *     }
   *   ],
   *   "total": number
   * }
   * @responseBody 400 - { "message": "Error message" }
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

  /**
   * @checkCode
   * @description Complete an order by ID and update sales aggregates.
   * @paramParam id - The ID of the order to complete.
   * @responseBody 200 - { "message": "Order completed successfully", "order": {} }
   * @responseBody 400 - { "message": "Error message" }
   */
  public async completeOrder({ params, response }: HttpContext) {
    const { id } = params;

    try {
      const order = await this.orderService.completeOrder(id);
      return response.status(200).json({ message: 'Order completed successfully', order });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }

  /**
   * @checkCode
   * @description Get the total sales count for a CodeRepo.
   * @paramParam id - The ID of the CodeRepo.
   * @responseBody 200 - { "codeRepoId": "string", "salesCount": number }
   * @responseBody 400 - { "message": "Error message" }
   */
  public async getCodeRepoSalesCount({ params, response }: HttpContext) {
    const { id } = params;

    try {
      const salesCount = await this.orderService.getCodeRepoSalesCount(id);
      return response.status(200).json({ codeRepoId: id, salesCount });
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message });
    }
  }
}
