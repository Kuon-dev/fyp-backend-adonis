import { faker } from '@faker-js/faker'
import type { SellerProfile, User } from '@prisma/client'
import { generateIdFromEntropySize } from 'lucia'

export const generateSellerProfiles = (users: User[], count: number): SellerProfile[] => {
  const sellerProfiles: SellerProfile[] = []

  // Shuffle users array to randomly select users to become sellers
  const sellerUsers = users.filter((user) => user.role === 'SELLER')
  const shuffledUsers = sellerUsers.sort(() => 0.5 - Math.random())

  for (let i = 0; i < count && i < users.length; i++) {
    const user = shuffledUsers[i]
    const sellerProfile: SellerProfile = {
      id: generateIdFromEntropySize(32),
      userId: user.id,
      profileImg: faker.image.avatar(),
      businessName: faker.company.name(),
      businessAddress: faker.location.streetAddress(),
      businessPhone: faker.phone.number(),
      businessEmail: faker.internet.email(),
      identityDoc: faker.system.filePath(),
      verificationDate: faker.date.past(),
    }
    console.log('sellerProfile', sellerProfile)
    sellerProfiles.push(sellerProfile)
  }

  return sellerProfiles
}
