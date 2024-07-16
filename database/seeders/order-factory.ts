import { faker } from '@faker-js/faker'
import { generateIdFromEntropySize } from 'lucia'
import { Order, OrderStatus, User, CodeRepo, SellerProfile } from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'

interface ExtendedUser extends User {
  sellerProfile: SellerProfile | null;
}

function generateDates() {
  const now = DateTime.now();
  const twoMonthsAgo = now.minus({ months: 2 });
  const createdAt = faker.date.between({ from: twoMonthsAgo.toJSDate(), to: now.toJSDate() });
  const updatedAt = faker.date.between({ from: createdAt, to: now.toJSDate() });
  const deletedAt = faker.datatype.boolean(0.1)
    ? faker.date.between({ from: updatedAt, to: now.toJSDate() })
    : null;
  return { createdAt, updatedAt, deletedAt };
}

function generateOrder(users: ExtendedUser[], codeRepos: CodeRepo[]): Omit<Order, 'id'> {
  const user = faker.helpers.arrayElement(users)
  const codeRepo = faker.helpers.arrayElement(codeRepos)
  const { createdAt, updatedAt, deletedAt } = generateDates()
  const status = faker.helpers.arrayElement(Object.values(OrderStatus))
  const totalAmount = parseFloat(faker.commerce.price({ min: 10, max: 1000 }))

  return {
    userId: user.id,
    codeRepoId: codeRepo.id,
    createdAt,
    updatedAt,
    deletedAt,
    status,
    totalAmount,
    stripePaymentIntentId: status === 'SUCCEEDED' ? faker.string.uuid() : null,
    stripePaymentMethodId: status === 'SUCCEEDED' ? faker.string.uuid() : null,
    payoutRequestId: null,
  }
}

async function updateSalesAggregateAndSellerBalance(
  order: Order,
  sellerId: string,
  sellerProfile: SellerProfile | null
) {
  if (order.status === 'SUCCEEDED') {
    const aggregateDate = DateTime.fromJSDate(order.createdAt).startOf('month').toJSDate()

    await prisma.$transaction(async (tx) => {
      // Update sales aggregate
      await tx.salesAggregate.upsert({
        where: {
          sellerId_date: {
            sellerId: sellerId,
            date: aggregateDate,
          },
        },
        update: {
          revenue: { increment: order.totalAmount },
          salesCount: { increment: 1 },
        },
        create: {
          id: generateIdFromEntropySize(32),
          sellerId: sellerId,
          date: aggregateDate,
          revenue: order.totalAmount,
          salesCount: 1,
        },
      })

      // Update seller balance
      if (sellerProfile) {
        await tx.sellerProfile.update({
          where: { id: sellerProfile.id },
          data: { balance: { increment: order.totalAmount } },
        })
      }
    })
  }
}

async function processBatch(orders: Omit<Order, 'id'>[], users: ExtendedUser[], codeRepos: CodeRepo[]) {
  const createdOrders: Order[] = []
  for (const orderData of orders) {
    try {
      await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            ...orderData,
            id: generateIdFromEntropySize(32),
          },
        })

        const codeRepo = codeRepos.find(repo => repo.id === createdOrder.codeRepoId)
        if (codeRepo) {
          const seller = users.find(user => user.id === codeRepo.userId)
          if (seller && seller.sellerProfile) {
            await updateSalesAggregateAndSellerBalance(createdOrder, seller.id, seller.sellerProfile)
          }
        }

        createdOrders.push(createdOrder)
        console.log(`Created order: ${createdOrder.id}`)
      })
    } catch (error) {
      console.error(`Error creating order:`, error)
    }
  }
  return createdOrders
}

export async function seedOrders(count: number = 100) {
  let successfullyCreated = 0
  const batchSize = 10 // Adjust this value based on your needs
  try {
    const users = await prisma.user.findMany({
      include: { sellerProfile: true },
    }) as ExtendedUser[]
    const codeRepos = await prisma.codeRepo.findMany()
    if (users.length === 0 || codeRepos.length === 0) {
      throw new Error('No users or code repos found. Please seed users and code repos first.')
    }
    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i)
      const orderBatch = Array.from({ length: batchCount }, () => generateOrder(users, codeRepos))
      const createdOrders = await processBatch(orderBatch, users, codeRepos)
      successfullyCreated += createdOrders.length
    }
    console.log(`Successfully seeded ${successfullyCreated} out of ${count} requested orders`)
  } catch (error) {
    console.error('Error seeding orders:', error)
  } finally {
    await prisma.$disconnect()
  }
  return { successfullyCreated }
}
