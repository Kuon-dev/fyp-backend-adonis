import { prisma } from '#services/prisma_service'
import { seedCodeRepos } from './repo-factory.js'
//import { generateOrders } from './order-factory.js'
import { generateUsers } from './user-factory.js'

async function main() {
  //await generateUsers(200)

  await seedCodeRepos(1000)
  console.log('Users generated')

  //await generateOrders(1000)
  console.log('Code repos generated')

  console.log('Orders generated')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
