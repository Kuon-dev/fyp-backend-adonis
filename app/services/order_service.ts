import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { Prisma, OrderStatus } from '@prisma/client'

@inject()
export default class OrderService {
  async createOrder(data: {
    userId: string
    repoId: string
    amount: number
    status: OrderStatus
    stripePaymentIntentId: string
  }, tx?: Prisma.TransactionClient) {
    const db = tx || prisma
    return await db.order.create({
      data: {
        userId: data.userId,
        codeRepoId: data.repoId,
        totalAmount: data.amount,
        status: data.status,
        stripePaymentIntentId: data.stripePaymentIntentId,
      },
    })
  }

  async getOrderById(orderId: string) {
    return await prisma.order.findUnique({
      where: { id: orderId },
    })
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, tx?: Prisma.TransactionClient) {
    const db = tx || prisma
    return await db.order.update({
      where: { id: orderId },
      data: { status },
    })
  }
}
