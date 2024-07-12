import { faker } from '@faker-js/faker'
import { prisma } from '#services/prisma_service'
import { Role, User, Profile, SellerProfile, SellerVerificationStatus } from '@prisma/client'
import { UserFactory } from '#factories/user_factory'

type UserWithProfile = {
  user: User
  profile?: Profile
  sellerProfile?: SellerProfile
}

/**
 * Generates a list of fake users and their profiles using the UserFactory.
 *
 * @param {number} [count=50] - The number of additional random users to generate.
 * @returns {Promise<UserWithProfile[]>} - An array of generated users and their profiles.
 */
export const generateUsers = async (count: number = 50): Promise<UserWithProfile[]> => {
  const users: UserWithProfile[] = []

  // Generate forced test users
  users.push(...(await generateForcedTestUsers()))

  // Generate additional random users
  const roles: Role[] = ['USER', 'SELLER', 'ADMIN', 'MODERATOR']

  for (let i = 0; i < count; i++) {
    const email = faker.internet.email()
    const password = 'password'
    const fullname = faker.person.fullName()
    const role = faker.helpers.arrayElement(roles)

    try {
      let userWithProfile: UserWithProfile

      switch (role) {
        case 'USER':
          userWithProfile = await createUserWithSpecialCases(i, { email, password, fullname })
          break
        case 'SELLER':
          userWithProfile = await createSellerWithSpecialCases(i, { email, password, fullname })
          break
        case 'ADMIN':
          userWithProfile = await UserFactory.createAdmin({ email, password, fullname })
          break
        case 'MODERATOR':
          userWithProfile = await UserFactory.createModerator({ email, password, fullname })
          break
      }

      users.push(userWithProfile)
    } catch (error) {
      console.error(`Failed to create user with role ${role}:`, error)
    }
  }

  console.log(`Successfully generated ${users.length} users.`)
  return users
}

async function generateForcedTestUsers(): Promise<UserWithProfile[]> {
  const forcedUsers: UserWithProfile[] = []
  const password = 'password'

  // Admin
  forcedUsers.push(
    await UserFactory.createAdmin({ email: 'admin@example.com', password, fullname: 'Admin User' })
  )

  // Normal user
  forcedUsers.push(
    await UserFactory.createUser({
      email: 'normalUser@example.com',
      password,
      fullname: 'Normal User',
    })
  )

  // Banned user
  const bannedUser = await UserFactory.createUser({
    email: 'bannedUser@example.com',
    password,
    fullname: 'Banned User',
  })
  await prisma.user.update({
    where: { id: bannedUser.user.id },
    data: { bannedUntil: faker.date.future() },
  })
  forcedUsers.push(bannedUser)

  // Unverified email user
  forcedUsers.push(
    await UserFactory.createUser({
      email: 'unverifiedEmailUser@example.com',
      password,
      fullname: 'Unverified Email User',
    })
  )

  // Deleted user
  const deletedUser = await UserFactory.createUser({
    email: 'deletedUser@example.com',
    password,
    fullname: 'Deleted User',
  })
  await prisma.user.update({
    where: { id: deletedUser.user.id },
    data: { deletedAt: new Date() },
  })
  forcedUsers.push(deletedUser)

  // Verified Seller
  const verifiedSeller = await UserFactory.createSeller({
    email: 'verifiedSeller@example.com',
    password,
    fullname: 'Verified Seller',
    businessName: faker.company.name(),
    businessAddress: faker.location.streetAddress(),
    businessPhone: faker.phone.number(),
    bankAccount: {
      accountHolderName: 'Verified Seller',
      accountNumber: faker.finance.accountNumber(),
      bankName: faker.company.name(),
      swiftCode: faker.finance.bic(),
    },
  })
  await prisma.user.update({
    where: { id: verifiedSeller.user.id },
    data: {
      emailVerified: true,
    },
  })
  await prisma.sellerProfile.update({
    where: { userId: verifiedSeller.user.id },
    data: {
      verificationStatus: SellerVerificationStatus.APPROVED,
      verificationDate: new Date(),
    },
  })
  forcedUsers.push(verifiedSeller)

  // Unverified Seller
  forcedUsers.push(
    await UserFactory.createSeller({
      email: 'unverifiedSeller@example.com',
      password,
      fullname: 'Unverified Seller',
      businessName: '',
      businessAddress: '',
      businessPhone: '',
    })
  )

  // Moderator
  forcedUsers.push(
    await UserFactory.createModerator({
      email: 'moderator@example.com',
      password,
      fullname: 'Moderator User',
    })
  )

  return forcedUsers
}

async function createUserWithSpecialCases(
  index: number,
  userData: { email: string; password: string; fullname: string }
): Promise<UserWithProfile> {
  let userWithProfile: UserWithProfile

  if (index % 10 === 0) {
    // Every 10th user is banned
    userWithProfile = await UserFactory.createUser(userData)
    await prisma.user.update({
      where: { id: userWithProfile.user.id },
      data: { bannedUntil: faker.date.future() },
    })
  } else if (index % 7 === 0) {
    // Every 7th user is deleted
    userWithProfile = await UserFactory.createUser(userData)
    await prisma.user.update({
      where: { id: userWithProfile.user.id },
      data: { deletedAt: new Date() },
    })
  } else if (index % 5 === 0) {
    // Every 5th user has a verified email
    userWithProfile = await UserFactory.createUser(userData)
    await prisma.user.update({
      where: { id: userWithProfile.user.id },
      data: { emailVerified: true },
    })
  } else {
    userWithProfile = await UserFactory.createUser(userData)
  }

  return userWithProfile
}

async function createSellerWithSpecialCases(
  index: number,
  userData: { email: string; password: string; fullname: string }
): Promise<UserWithProfile> {
  const sellerData = {
    ...userData,
    businessName: '',
    businessAddress: '',
    businessPhone: '',
  }

  let userWithProfile: UserWithProfile = await UserFactory.createSeller(sellerData)

  if (index % 3 === 0) {
    // Every 3rd seller is verified
    await prisma.user.update({
      where: { id: userWithProfile.user.id },
      data: {
        emailVerified: true,
      },
    })
    await prisma.sellerProfile.update({
      where: { userId: userWithProfile.user.id },
      data: {
        verificationStatus: SellerVerificationStatus.APPROVED,
        verificationDate: new Date(),
        businessName: faker.company.name(),
        businessAddress: faker.location.streetAddress(),
        businessPhone: faker.phone.number(),
      },
    })
    // Add bank account for verified sellers
    await prisma.bankAccount.create({
      data: {
        sellerProfileId: userWithProfile.sellerProfile!.id,
        accountHolderName: userData.fullname,
        accountNumber: faker.finance.accountNumber(),
        bankName: faker.company.name(),
        swiftCode: faker.finance.bic(),
      },
    })
  } else if (index % 5 === 0) {
    // Every 5th seller is rejected
    await prisma.sellerProfile.update({
      where: { userId: userWithProfile.user.id },
      data: {
        verificationStatus: SellerVerificationStatus.REJECTED,
      },
    })
  }
  // All other sellers remain in PENDING status

  return userWithProfile
}
