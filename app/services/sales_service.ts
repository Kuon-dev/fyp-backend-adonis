import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { Prisma } from '@prisma/client'

@inject()
export default class SalesService {
  async updateSalesAggregate(sellerId: string, amount: number, tx?: Prisma.TransactionClient) {
    const db = tx || prisma
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingAggregate = await db.salesAggregate.findUnique({
      where: {
        sellerId_date: {
          sellerId,
          date: today,
        },
      },
    })

    if (existingAggregate) {
      return await db.salesAggregate.update({
        where: { id: existingAggregate.id },
        data: {
          revenue: { increment: amount },
          salesCount: { increment: 1 },
        },
      })
    } else {
      return await db.salesAggregate.create({
        data: {
          sellerId,
          date: today,
          revenue: amount,
          salesCount: 1,
        },
      })
    }
  }

  async getSalesAggregate(sellerId: string, startDate: Date, endDate: Date) {
    return await prisma.salesAggregate.findMany({
      where: {
        sellerId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })
  }
}
