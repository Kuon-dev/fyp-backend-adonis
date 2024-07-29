import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'
import { SellerVerificationStatus } from '@prisma/client'

test.group('Checkout Process', () => {
  async function getUserToken(client: ApiClient, email: string): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email,
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

const getRepoId = async (client: ApiClient, token: string, userId?: string): Promise<string> => {
  // Get the repositories the user has access to
  const repoAccess = await prisma.userRepoAccess.findMany({
    where: {
      userId,
    },
  });

  // Get all repositories that have not been deleted and are not yet purchased by the user
  const allRepos = await prisma.codeRepo.findMany({
    where: {
      deletedAt: null,
      orders: {
        none: {
          userId,
        },
      },
    },
    include: {
      orders: true, // Include orders to filter out purchased repos
    },
  });

  // Filter repositories to exclude those the user has access to
  const filteredRepos = allRepos.filter((repo) => {
    const hasAccess = repoAccess.some((ra) => ra.repoId === repo.id);
    return !hasAccess;
  });

  // Get a random repository from the filtered list
  const randomRepo = filteredRepos[Math.floor(Math.random() * filteredRepos.length)];

  return randomRepo.id;
};

  async function cleanupRepo(repoId: string) {
    // Delete associated user repo accesses
    await prisma.userRepoAccess.deleteMany({ where: { repoId: repoId } })
    // Delete associated orders
    await prisma.order.deleteMany({ where: { codeRepoId: repoId } })
    // Now delete the repo
    await prisma.codeRepo.delete({ where: { id: repoId } })
  }

  test('successfully initiate checkout and receive Stripe secret', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')
    const user = await prisma.user.findFirst({ where: { email: 'normalUser@example.com' } })
    const repoId = await getRepoId(client, token, user?.id ?? '')

    const response = await client
      .post('/api/v1/checkout')
      .header('Cookie', token)
      .json({ repoId })

    console.log(response)

    response.assertStatus(200)
    assert.properties(response.body(), ['clientSecret'])
    assert.isString(response.body().clientSecret)
    assert.match(response.body().clientSecret, /^pi_.*_secret_.*/)
  })

  test('fail to initiate checkout for own repo', async ({ client, assert }) => {
    const token = await getUserToken(client, 'verifiedSeller@example.com')
    const seller = await prisma.user.findFirst({ where: { email: 'verifiedSeller@example.com' } })
    const repoId = await prisma.codeRepo.findFirst({
      where: {
        userId: seller?.id
      }
    })

    const response = await client
      .post('/api/v1/checkout')
      .header('Cookie', token)
      .json({ repoId: repoId?.id })

    console.log('status code', response.status())
    response.assertStatus(400)
    assert.equal(response.body().message, 'You cannot access your own repo through checkout')
  })

  test('fail to initiate checkout for non-existent repo', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')
    const nonExistentRepoId = 'cl1234567890abcdef' // Using a CUID-like format

    const response = await client
      .post('/api/v1/checkout')
      .header('Cookie', token)
      .json({ repoId: nonExistentRepoId })

    response.assertStatus(400)
    assert.equal(response.body().message, 'Repo not found')
  })

  test('fail to initiate checkout without authentication', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')
    const user = await prisma.user.findFirst({ where: { email: 'normalUser@example.com' } })
    const repoId = await getRepoId(client, token, user?.id ?? '')

    const response = await client
      .post('/api/v1/checkout')
      .json({ repoId: repoId })

    response.assertStatus(401)
    assert.equal(response.body().message, 'User not authenticated')
  })

  test('successfully initiate checkout for free repo', async ({ client, assert }) => {

    const token = await getUserToken(client, 'normalUser@example.com')
    const repoId = await getRepoId(client, token)
    const sellerId = (await prisma.user.findFirst({ where: { email: 'verifiedSeller@example.com' } }))?.id ?? ''

    // Create a new free repo for this test
    const freeRepo = await prisma.codeRepo.create({
      data: {
        name: 'Free Test Repo',
        description: 'A free repo for testing checkout',
        price: 0,
        userId: sellerId,
        language: 'JSX',
        sourceJs: 'console.log("Free Repo Test")',
        sourceCss: 'body { color: green; }',
        visibility: 'public',
        status: 'active',
      },
    })

    const response = await client
      .post('/api/v1/checkout')
      .header('Cookie', token)
      .json({ repoId: freeRepo.id })

    response.assertStatus(200)
    assert.properties(response.body(), ['success', 'orderId', 'message'])
    assert.isTrue(response.body().success)
    assert.isString(response.body().orderId)
    assert.equal(response.body().message, 'Access granted to free repo')

    // Clean up
    await cleanupRepo(freeRepo.id)
  })
})
