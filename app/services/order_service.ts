import { prisma } from '#services/prisma_service';
import { Order, OrderStatus } from '@prisma/client';

interface OrderCreationData {
  userId: string;
  codeRepoId: string;
  totalAmount: number;
}

interface OrderUpdateData {
  status?: OrderStatus;
  totalAmount?: number;
}

interface OrderSearchCriteria {
  userId?: string;
  status?: OrderStatus;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Service class for managing orders.
 */
export class OrderService {
  /**
   * Create a new order.
   *
   * @param {OrderCreationData} data - The order creation data.
   * @returns {Promise<Order>} - The created order.
   */
  async createOrder(data: OrderCreationData): Promise<Order> {
    return prisma.order.create({
      data,
    });
  }

  /**
   * Retrieve a paginated list of all orders.
   *
   * @param {number} page - The page number.
   * @param {number} limit - The number of items per page.
   * @returns {Promise<{ orders: Order[], total: number }>} - The paginated orders and total count.
   */
  async getAllOrders(page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { deletedAt: null }
      }),
      prisma.order.count({
        where: { deletedAt: null }
      }),
    ]);

    return { orders, total };
  }

  /**
   * Retrieve an order by its ID.
   *
   * @param {string} id - The ID of the order.
   * @returns {Promise<Order>} - The order.
   */
  async getOrderById(id: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id, deletedAt: null },
    });

    if (!order) {
      throw new Error(`Order with ID ${id} not found.`);
    }

    return order;
  }

  /**
   * Retrieve a paginated list of orders for a specific user.
   *
   * @param {string} userId - The user ID.
   * @param {number} page - The page number.
   * @param {number} limit - The number of items per page.
   * @returns {Promise<{ orders: Order[], total: number }>} - The paginated orders and total count.
   */
  async getOrdersByUser(userId: string, page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { userId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return { orders, total };
  }

  /**
   * Update an order by its ID.
   *
   * @param {string} id - The ID of the order.
   * @param {OrderUpdateData} data - The data to update the order with.
   * @returns {Promise<Order>} - The updated order.
   */
  async updateOrder(id: string, data: OrderUpdateData): Promise<Order> {
    return prisma.order.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Soft delete an order by its ID.
   *
   * @param {string} id - The ID of the order.
   * @returns {Promise<Order>} - The soft deleted order.
   */
  async deleteOrder(id: string): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Retrieve a paginated list of orders filtered by status.
   *
   * @param {OrderStatus} status - The order status.
   * @param {number} page - The page number.
   * @param {number} limit - The number of items per page.
   * @returns {Promise<{ orders: Order[], total: number }>} - The paginated orders and total count.
   */
  async getOrdersByStatus(status: OrderStatus, page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { status, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({
        where: { status, deletedAt: null },
      }),
    ]);

    return { orders, total };
  }

  /**
   * Retrieve a paginated list of orders for a specific user filtered by status.
   *
   * @param {string} userId - The user ID.
   * @param {OrderStatus} status - The order status.
   * @param {number} page - The page number.
   * @param {number} limit - The number of items per page.
   * @returns {Promise<{ orders: Order[], total: number }>} - The paginated orders and total count.
   */
  async getUserOrdersByStatus(userId: string, status: OrderStatus, page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { userId, status, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({
        where: { userId, status, deletedAt: null },
      }),
    ]);

    return { orders, total };
  }

  /**
   * Search orders based on various criteria.
   *
   * @param {OrderSearchCriteria} criteria - The search criteria.
   * @param {number} page - The page number.
   * @param {number} limit - The number of items per page.
   * @returns {Promise<{ orders: Order[], total: number }>} - The search results and total count.
   */
  async searchOrders(criteria: OrderSearchCriteria, page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    const { userId, status, fromDate, toDate, minAmount, maxAmount } = criteria;

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: {
          userId,
          status,
          deletedAt: null,
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
          totalAmount: {
            gte: minAmount,
            lte: maxAmount,
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({
        where: {
          userId,
          status,
          deletedAt: null,
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
          totalAmount: {
            gte: minAmount,
            lte: maxAmount,
          },
        },
      }),
    ]);

    return { orders, total };
  }
}

