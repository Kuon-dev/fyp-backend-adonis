import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'

test.group('Review Update Operations', () => {
  async function getUserToken(client: ApiClient): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'normalUser@example.com',
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  async function getAdminToken(client: ApiClient): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  async function createTestReview(client: ApiClient, token: string): Promise<string> {
    // Get an accessible repo
    const reposResponse = await client.get('/api/v1/repos/accessed').header('Cookie', token)
    const repoId = reposResponse.body().accessibleRepos[0].id

    if (!repoId) {
      throw new Error('No accessible repos found for the user')
    }

    // Create a review
    const reviewData = {
      content: 'Test Review for Update',
      repoId: repoId,
      rating: 4,
    }
    const response = await client.post('/api/v1/reviews').header('Cookie', token).json(reviewData)
    return response.body().id
  }

  test('successfully update a review', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await createTestReview(client, token)

    const updateData = {
      content: 'Updated Test Review',
      rating: 5,
    }

    const response = await client
      .put(`/api/v1/reviews/${reviewId}`)
      .header('Cookie', token)
      .json(updateData)

    response.assertStatus(200)
    assert.properties(response.body(), ['id', 'content', 'rating', 'userId', 'repoId'])
    assert.equal(response.body().content, updateData.content)
    assert.equal(response.body().rating, updateData.rating)
  })

  test('fail to update review with invalid data', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await createTestReview(client, token)

    const invalidUpdateData = {
      content: '', // Invalid: empty content
      rating: 6, // Invalid: rating out of range
    }

    const response = await client
      .put(`/api/v1/reviews/${reviewId}`)
      .header('Cookie', token)
      .json(invalidUpdateData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation error')
    assert.isArray(response.body().errors)
  })

  test('fail to update review without authentication', async ({ client }) => {
    const response = await client.put('/api/v1/reviews/someId').json({ content: 'Updated Review' })
    response.assertStatus(401)
  })

  test('fail to update non-existent review', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const nonExistentId = 'non_existent_id'

    const response = await client
      .put(`/api/v1/reviews/${nonExistentId}`)
      .header('Cookie', token)
      .json({ content: 'Updated Non-Existent Review' })

    response.assertStatus(404)
    assert.equal(response.body().message, 'Review not found')
  })

  test('fail to update review of another user', async ({ client, assert }) => {
    const userToken = await getUserToken(client)
    const reviewId = await createTestReview(client, userToken)

    const adminToken = await getAdminToken(client)

    const response = await client
      .put(`/api/v1/reviews/${reviewId}`)
      .header('Cookie', adminToken)
      .json({ content: 'Attempt to Update Other User\'s Review' })

    response.assertStatus(403)
    assert.equal(response.body().message, 'You do not have permission to update this review')
  })

  test('successfully update review content only', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await createTestReview(client, token)

    const updateData = {
      content: 'Updated content only',
    }

    const response = await client
      .put(`/api/v1/reviews/${reviewId}`)
      .header('Cookie', token)
      .json(updateData)

    response.assertStatus(200)
    assert.equal(response.body().content, updateData.content)
    // Check that rating hasn't changed
    assert.equal(response.body().rating, 4)
  })

  test('successfully update review rating only', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await createTestReview(client, token)

    const updateData = {
      rating: 2,
    }

    const response = await client
      .put(`/api/v1/reviews/${reviewId}`)
      .header('Cookie', token)
      .json(updateData)

    response.assertStatus(200)
    assert.equal(response.body().rating, updateData.rating)
    // Check that content hasn't changed
    assert.equal(response.body().content, 'Test Review for Update')
  })
})
