import { prisma } from '#services/prisma_service'
import { generateOrders } from './order-factory.js'
import { generateUsers } from './user-factory.js'

async function main() {
  await generateUsers(200)
  console.log('Users generated')

  await generateOrders(1000)
  console.log('Code repos generated')

  console.log('Orders generated')
}
