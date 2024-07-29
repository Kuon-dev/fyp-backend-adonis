import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'
import { User, CodeRepo } from '@prisma/client'

async function getTestData() {
  const testUser = await prisma.user.findUnique({
    where: { email: 'normalUser@example.com' },
  })

  if (!testUser) {
    throw new Error('Test user not found')
  }

  const purchasedRepo = await prisma.codeRepo.findFirst({
    where: {
      userAccesses: {
        some: {
          userId: testUser.id,
        },
      },
    },
  })

  const unpurchasedRepo = await prisma.codeRepo.findFirst({
    where: {
      userAccesses: {
        none: {
          userId: testUser.id,
        },
      },
    },
  })

  if (!purchasedRepo || !unpurchasedRepo) {
    throw new Error('Test repos not found')
  }

  return { testUser, purchasedRepo, unpurchasedRepo }
}

async function loginAsUser(client: ApiClient) {
  const response = await client.post('/api/v1/login').json({
    email: 'normalUser@example.com',
    password: 'password',
  })
  return response.headers()['set-cookie'][0]
}

test.group('Review Controller - POST Operations', () => {
  test('authenticated user can create a review for a purchased repo', async ({ client, assert }) => {
    const { testUser, purchasedRepo } = await getTestData()
    const userToken = await loginAsUser(client)
    const response = await client.post('/api/v1/reviews').header('Cookie', userToken).json({
      content: 'This is a test review',
      repoId: purchasedRepo.id,
      rating: 5,
    })
    response.assertStatus(201)
    assert.properties(response.body(), [
      'id',
      'content',
      'userId',
      'repoId',
      'rating',
      'createdAt',
      'updatedAt',
    ])
    assert.equal(response.body().content, 'This is a test review')
    assert.equal(response.body().repoId, purchasedRepo.id)
    assert.equal(response.body().rating, 5)
  })

  test('fail to create review for a non-purchased repo', async ({ client }) => {
    const { unpurchasedRepo } = await getTestData()
    const userToken = await loginAsUser(client)
    const response = await client.post('/api/v1/reviews').header('Cookie', userToken).json({
      content: 'This is a test review',
      repoId: unpurchasedRepo.id,
      rating: 5,
    })
    response.assertStatus(401)
    response.assertBodyContains({ message: 'User does not have access to this repo' })
  })

  test('fail to create review with invalid data', async ({ client }) => {
    const userToken = await loginAsUser(client)
    const response = await client.post('/api/v1/reviews').header('Cookie', userToken).json({
      // Missing required fields
    })
    response.assertStatus(400)
    response.assertBodyContains({ message: 'Validation error' })
  })

  test('unauthenticated user cannot create a review', async ({ client }) => {
    const { purchasedRepo } = await getTestData()
    const response = await client.post('/api/v1/reviews').json({
      content: 'This is a test review',
      repoId: purchasedRepo.id,
      rating: 5,
    })
    response.assertStatus(401)
  })

  test('fail to create review with invalid rating', async ({ client }) => {
    const { purchasedRepo } = await getTestData()
    const userToken = await loginAsUser(client)
    const response = await client.post('/api/v1/reviews').header('Cookie', userToken).json({
      content: 'This is a test review',
      repoId: purchasedRepo.id,
      rating: 6, // Invalid rating (should be 1-5)
    })
    response.assertStatus(400)
    response.assertBodyContains({ message: 'Validation error' })
  })

  test('can create review with maximum allowed content length', async ({ client, assert }) => {
    const { purchasedRepo } = await getTestData()
    const userToken = await loginAsUser(client)
    const maxLengthContent = 'a'.repeat(1000) // Max length is 1000 characters
    const response = await client.post('/api/v1/reviews').header('Cookie', userToken).json({
      content: maxLengthContent,
      repoId: purchasedRepo.id,
      rating: 3,
    })
    response.assertStatus(201)
    assert.equal(response.body().content.length, 1000)
  })

  test('fail to create review exceeding maximum content length', async ({ client }) => {
    const { purchasedRepo } = await getTestData()
    const userToken = await loginAsUser(client)
    const tooLongContent = 'a'.repeat(1001) // Exceeds max length of 1000 characters
    const response = await client.post('/api/v1/reviews').header('Cookie', userToken).json({
      content: tooLongContent,
      repoId: purchasedRepo.id,
      rating: 3,
    })
    response.assertStatus(400)
    response.assertBodyContains({ message: 'Validation error' })
  })
})
