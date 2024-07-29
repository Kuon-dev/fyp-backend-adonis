import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'

test.group('Comment Controller - GET Operations', () => {
  async function getUserToken(client: ApiClient): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'normalUser@example.com',
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  async function getReviewId(client: ApiClient, token: string): Promise<string> {
    const reposResponse = await client.get('/api/v1/repos/accessed').header('Cookie', token)
    const repoId = reposResponse.body().accessibleRepos[0].id
    const reviewsResponse = await client.get(`/api/v1/repo/${repoId}/reviews`).header('Cookie', token)
    return reviewsResponse.body().data[0].id
  }

  async function getRepoId(client: ApiClient, token: string): Promise<string> {
    const reposResponse = await client.get('/api/v1/repos/accessed').header('Cookie', token)
    return reposResponse.body().accessibleRepos[0].id
  }

  async function createTestReview(client: ApiClient, token: string, repoId: string): Promise<string> {
    const reviewData = {
      content: 'Test review for comment pagination',
      repoId: repoId,
      rating: 4
    }
    const reviewResponse = await client.post('/api/v1/reviews').header('Cookie', token).json(reviewData)
    return reviewResponse.body().id
  }

  async function createTestComment(client: ApiClient, token: string, reviewId: string): Promise<string> {
    const commentData = {
      content: 'Test comment for pagination',
      reviewId: reviewId,
    }
    const response = await client
      .post('/api/v1/comments')
      .header('Cookie', token)
      .json(commentData)
    return response.body().id
  }

  test('get comment by id', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)
    const commentId = await createTestComment(client, token, reviewId)

    const response = await client.get(`/api/v1/comments/${commentId}`).header('Cookie', token)

    response.assertStatus(200)
    assert.properties(response.body(), ['id', 'content', 'userId', 'reviewId', 'createdAt', 'updatedAt'])
    assert.equal(response.body().id, commentId)
    assert.equal(response.body().reviewId, reviewId)
  })

  test('get paginated comments for a review', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const repoId = await getRepoId(client, token)
    const reviewId = await createTestReview(client, token, repoId)
    
    // Create multiple comments
    for (let i = 0; i < 5; i++) {
      await createTestComment(client, token, reviewId)
    }

    const response = await client
      .get(`/api/v1/repo/${repoId}/reviews/${reviewId}`)
      .header('Cookie', token)
      .qs({ page: 1, perPage: 10 })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)
    assert.equal(response.body().data.length, 5)
    assert.properties(response.body().meta, ['total', 'page', 'perPage', 'lastPage'])
  })

  test('get paginated comments for a review - second page', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const repoId = await getRepoId(client, token)
    const reviewId = await createTestReview(client, token, repoId)
    
    // Create multiple comments
    for (let i = 0; i < 15; i++) {
      await createTestComment(client, token, reviewId)
    }

    const response = await client
      .get(`/api/v1/repo/${repoId}/reviews/${reviewId}`)
      .header('Cookie', token)
      .qs({ page: 2, perPage: 10 })

    response.assertStatus(200)
    assert.properties(response.body(), ['data', 'meta'])
    assert.isArray(response.body().data)
    assert.equal(response.body().meta.page, 2)
    assert.equal(response.body().data.length, 5) // Second page should have 5 comments
  })

  test('get paginated comments for a review - invalid page', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const repoId = await getRepoId(client, token)
    const reviewId = await createTestReview(client, token, repoId)

    const response = await client
      .get(`/api/v1/repo/${repoId}/reviews/${reviewId}`)
      .header('Cookie', token)
      .qs({ page: 0, perPage: 10 })

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation error')
  })

  test('get paginated comments for a non-existent review', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const repoId = await getRepoId(client, token)
    const nonExistentReviewId = 'cl1234567890abcdef' // Using a CUID-like format

    const response = await client
      .get(`/api/v1/repo/${repoId}/reviews/${nonExistentReviewId}`)
      .header('Cookie', token)
      .qs({ page: 1, perPage: 10 })

    response.assertStatus(404)
    assert.equal(response.body().message, 'Review not found')
  })

  test('get paginated comments for a review - invalid page', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)

    const response = await client
      .get(`/api/v1/repo/${reviewId}/reviews`)
      .header('Cookie', token)
      .qs({ page: 0, perPage: 10 })

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation error')
  })

  test('get all flagged comments (admin only)', async ({ client, assert }) => {
    const adminToken = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password',
    }).then(response => response.headers()['set-cookie'][0])

    const response = await client.get('/api/v1/comments').header('Cookie', adminToken)

    response.assertStatus(200)
    assert.isArray(response.body())
  })

  test('get all flagged comments - unauthorized', async ({ client, assert }) => {
    const token = await getUserToken(client)

    const response = await client.get('/api/v1/comments').header('Cookie', token)

    response.assertStatus(404)
  })
})
