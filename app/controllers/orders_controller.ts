import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { z } from 'zod'
import OrderService from '#services/order_service'
import { prisma } from '#services/prisma_service'
import { OrderStatus } from '@prisma/client'

const createOrderSchema = z.object({
  repoId: z.string(),
  amount: z.number().positive(),
  stripePaymentIntentId: z.string(),
})

const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus),
})

@inject()
export default class OrderController {
  constructor(protected orderService: OrderService) {}

  /**
   * @createOrder
   * @description Create a new order
   * @requestBody {
   *   "repoId": "clxxxxxxxxxxxxxxxx",
   *   "amount": 1000,
   *   "stripePaymentIntentId": "pi_xxxxxxxxxxxxx"
   * }
   * @responseBody 201 - { "id": "clxxxxxxxxxxxxxxxx", ... }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 500 - { "message": "Failed to create order" }
   */
  public async create({ request, response }: HttpContext) {
    try {
      const data = createOrderSchema.parse(request.body())
      const userId = request.user?.id

      if (!userId) {
        return response.unauthorized({ message: 'User not authenticated' })
      }

      const order = await this.orderService.createOrder({
        userId,
        repoId: data.repoId,
        amount: data.amount,
        status: OrderStatus.SUCCEEDED, // Assuming default status, adjust as needed
        stripePaymentIntentId: data.stripePaymentIntentId,
      })
      return response.created(order)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.badRequest({ message: 'Invalid input data', errors: error.errors })
      }
      return response.internalServerError({ message: 'Failed to create order' })
    }
  }

  /**
   * @getOrder
   * @description Get an order by ID
   * @paramParam id - The ID of the order
   * @responseBody 200 - { "id": "clxxxxxxxxxxxxxxxx", ... }
   * @responseBody 404 - { "message": "Order not found" }
   */
  public async show({ params, response, request }: HttpContext) {
    const userId = request.user?.id

    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' })
    }

    const order = await this.orderService.getOrderById(params.id)
    if (!order) {
      return response.notFound({ message: 'Order not found' })
    }

    // Check if the order belongs to the authenticated user
    if (order.userId !== userId) {
      return response.forbidden({ message: 'Access denied' })
    }

    return response.ok(order)
  }

  /**
   * @listOrders
   * @description List orders for the authenticated user
   * @queryParam page - Page number
   * @queryParam limit - Number of items per page
   * @responseBody 200 - { "data": [...], "meta": { ... } }
   */
  public async index({ request, response }: HttpContext) {
    const userId = request.user?.id

    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' })
    }

    // Since getOrdersByUser is not implemented in the service, we'll use prisma directly here
    // In a real-world scenario, you should implement this method in the OrderService
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        codeRepo: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    const total = await prisma.order.count({ where: { userId } })

    return response.ok({
      data: orders,
      meta: {
        total,
      },
    })
  }

  /**
   * @updateOrder
   * @description Update an order's status
   * @paramParam id - The ID of the order
   * @requestBody {
   *   "status": "CANCELLED"
   * }
   * @responseBody 200 - { "id": "clxxxxxxxxxxxxxxxx", ... }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 404 - { "message": "Order not found" }
   */
  public async update({ params, request, response }: HttpContext) {
    try {
      const { status } = updateOrderSchema.parse(request.body())
      const userId = request.user?.id

      if (!userId) {
        return response.unauthorized({ message: 'User not authenticated' })
      }

      const order = await this.orderService.getOrderById(params.id)
      if (!order) {
        return response.notFound({ message: 'Order not found' })
      }

      if (order.userId !== userId) {
        return response.forbidden({ message: 'Access denied' })
      }

      const updatedOrder = await this.orderService.updateOrderStatus(params.id, status)
      return response.ok(updatedOrder)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.badRequest({ message: 'Invalid input data', errors: error.errors })
      }
      return response.internalServerError({ message: 'Failed to update order' })
    }
  }
}
