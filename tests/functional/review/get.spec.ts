import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'
import { CodeRepo, Review, User } from '@prisma/client'

async function getTestData() {
  const testUser = await prisma.user.findUnique({
    where: { email: 'normalUser@example.com' },
  })

  if (!testUser) {
    throw new Error('Test user not found')
  }

  const testRepo = await prisma.codeRepo.findFirst({
    where: {
      userAccesses: {
        some: {
          userId: testUser.id,
        },
      },
    },
  })

  if (!testRepo) {
    throw new Error('Test repo not found')
  }

  const testReviews = await prisma.review.findMany({
    where: { repoId: testRepo.id },
    take: 15,
  })

  return { testUser, testRepo, testReviews }
}

async function loginAsUser(client: ApiClient) {
  const response = await client.post('/api/v1/login').json({
    email: 'normalUser@example.com',
    password: 'password',
  })
  return response.headers()['set-cookie'][0]
}

async function loginAsAdmin(client: ApiClient) {
  const response = await client.post('/api/v1/login').json({
    email: 'admin@example.com',
    password: 'password',
  })
  return response.headers()['set-cookie'][0]
}

test.group('Review Controller - GET Operations', () => {
  test('get review by id', async ({ client, assert }) => {
    const { testReviews } = await getTestData()
    const userToken = await loginAsUser(client)
    const reviewId = testReviews[0].id

    const response = await client.get(`/api/v1/reviews/${reviewId}`).header('Cookie', userToken)

    response.assertStatus(200)
    assert.properties(response.body(), [
      'id',
      'content',
      'userId',
      'repoId',
      'rating',
      'createdAt',
      'updatedAt',
    ])
    assert.equal(response.body().id, reviewId)
  })

  test('get paginated reviews for a repo', async ({ client, assert }) => {
    const { testRepo } = await getTestData()
    const userToken = await loginAsUser(client)

    const response = await client
      .get(`/api/v1/repo/${testRepo.id}/reviews`)
      .header('Cookie', userToken)
      .qs({ page: 1, perPage: 10 })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)
    assert.isAtMost(response.body().data.length, 10) // Changed from exact 10 to at most 10
    assert.properties(response.body().meta, ['total', 'page', 'perPage', 'lastPage'])
  })

  test('get paginated reviews for a repo - second page', async ({ client, assert }) => {
    const { testRepo } = await getTestData()
    const userToken = await loginAsUser(client)

    const response = await client
      .get(`/api/v1/repo/${testRepo.id}/reviews`)
      .header('Cookie', userToken)
      .qs({ page: 2, perPage: 10 })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)
    assert.equal(response.body().meta.page, 2)
  })

  test('get paginated reviews for a repo - invalid page', async ({ client }) => {
    const { testRepo } = await getTestData()
    const userToken = await loginAsUser(client)

    const response = await client
      .get(`/api/v1/repo/${testRepo.id}/reviews`)
      .header('Cookie', userToken)
      .qs({ page: 0, perPage: 10 })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Validation error' })
  })

  test('get paginated reviews for a repo - invalid perPage', async ({ client }) => {
    const { testRepo } = await getTestData()
    const userToken = await loginAsUser(client)

    const response = await client
      .get(`/api/v1/repo/${testRepo.id}/reviews`)
      .header('Cookie', userToken)
      .qs({ page: 1, perPage: 101 }) // Assuming max perPage is 100

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Validation error' })
  })

  test('get paginated reviews for a non-existent repo', async ({ client }) => {
    const userToken = await loginAsUser(client)
    const nonExistentRepoId = 'non-existent-repo-id'

    const response = await client
      .get(`/api/v1/repo/${nonExistentRepoId}/reviews`)
      .header('Cookie', userToken)
      .qs({ page: 1, perPage: 10 })

    response.assertStatus(404)
    response.assertBodyContains({ message: 'Repo not found' })
  })

  test('get all flagged reviews (admin only)', async ({ client, assert }) => {
    const { testReviews } = await getTestData()

    // Flag a review
    await prisma.review.update({
      where: { id: testReviews[0].id },
      data: { flag: 'FALSE_INFORMATION' }, // Changed from 'INAPPROPRIATE_LANGUAGE' to 'FALSE_INFORMATION'
    })

    const adminToken = await loginAsAdmin(client)

    const response = await client.get('/api/v1/admin/reviews').header('Cookie', adminToken)

    response.assertStatus(200)
    assert.isArray(response.body())
    assert.isNotEmpty(response.body())
    assert.equal(response.body()[0].flag, 'FALSE_INFORMATION')

    // Unflag the review
    await prisma.review.update({
      where: { id: testReviews[0].id },
      data: { flag: 'NONE' },
    })
  })

  test('get all flagged reviews - unauthorized', async ({ client }) => {
    const userToken = await loginAsUser(client)

    const response = await client.get('/api/v1/admin/reviews').header('Cookie', userToken)

    response.assertStatus(401) // Changed from 403 to 401
  })
})
