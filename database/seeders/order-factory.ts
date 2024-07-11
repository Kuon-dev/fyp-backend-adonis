import { generateIdFromEntropySize } from 'lucia'
import { prisma } from '#services/prisma_service'
import { faker } from '@faker-js/faker'
import { Order, OrderStatus } from '@prisma/client'
import { DateTime } from 'luxon'

function generateDates() {
  const createdAt = faker.date.past()
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() })
  const deletedAt = faker.datatype.boolean(0.1)
    ? faker.date.between({ from: updatedAt, to: new Date() })
    : null
  return { createdAt, updatedAt, deletedAt }
}

export async function generateOrders(count: number = 100) {
  const users = await prisma.user.findMany({ select: { id: true } })
  const codeRepos = await prisma.codeRepo.findMany({ select: { id: true } })

  const orderStatus: OrderStatus[] = ['PENDING', 'COMPLETED', 'CANCELLED']

  const generateOrders = (count: number): Order[] => {
    const generatedOrders: Order[] = []

    for (let i = 0; i < count; i++) {
      const randomUserId = faker.helpers.arrayElement(users).id
      const randomCodeRepoId = faker.helpers.arrayElement(codeRepos).id
      const { createdAt, updatedAt, deletedAt } = generateDates()

      const order: Order = {
        id: generateIdFromEntropySize(32),
        userId: randomUserId,
        codeRepoId: randomCodeRepoId,
        totalAmount: parseFloat(faker.commerce.price()),
        status: faker.helpers.arrayElement(orderStatus),
        createdAt,
        updatedAt,
        deletedAt,
      }
      generatedOrders.push(order)
    }

    return generatedOrders
  }

  const orders = generateOrders(count)

  await prisma.order.createMany({
    data: orders,
  })

  // Update sales aggregates for completed orders
  const completedOrders = orders.filter((order) => order.status === 'COMPLETED')

  for (const order of completedOrders) {
    const aggregateDate = DateTime.fromJSDate(order.createdAt).startOf('month').toJSDate()

    await prisma.salesAggregate.upsert({
      where: {
        sellerId_date: {
          sellerId: order.userId, // Assuming the seller is the user who owns the codeRepo
          date: aggregateDate,
        },
      },
      update: {
        revenue: { increment: order.totalAmount },
        salesCount: { increment: 1 },
      },
      create: {
        sellerId: order.userId,
        date: aggregateDate,
        revenue: order.totalAmount,
        salesCount: 1,
      },
    })
  }

  console.log('Seeded orders and updated sales aggregates')
}
