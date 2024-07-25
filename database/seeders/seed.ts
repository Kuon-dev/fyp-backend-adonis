import { prisma } from '#services/prisma_service'
import { seedCodeRepos } from './repo-factory.js'
import { seedOrders } from './order-factory.js'
import { generateUsers } from './user-factory.js'
import { seedReviewsAndComments } from './comment-factory.js'
import { seedPayoutsAndRequests } from './payout-seeder.js'
import { seedSupportTickets } from './support-seeder.js'

async function main() {
  await generateUsers(100)
  console.log('Users generated')
  await seedCodeRepos(400)
  await seedReviewsAndComments(300)
  await seedOrders(2000)
  await seedPayoutsAndRequests(50)
  console.log('Orders generated')
  await seedSupportTickets(200)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
