import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'

test.group('Comment Controller - PUT Operations', () => {
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

  async function getReviewId(client: ApiClient, token: string): Promise<string> {
    const reposResponse = await client.get('/api/v1/repos/accessed').header('Cookie', token)
    const repoId = reposResponse.body().accessibleRepos[0].id
    const reviewsResponse = await client.get(`/api/v1/repo/${repoId}/reviews`).header('Cookie', token)
    return reviewsResponse.body().data[0].id
  }

  async function createTestComment(client: ApiClient, token: string, reviewId: string): Promise<string> {
    const commentData = {
      content: 'Test comment for PUT operations',
      reviewId: reviewId,
    }
    const response = await client
      .post('/api/v1/comments')
      .header('Cookie', token)
      .json(commentData)
    return response.body().id
  }

  test('successfully update a comment', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)
    const commentId = await createTestComment(client, token, reviewId)

    const updateData = {
      content: 'Updated comment content',
    }

    const response = await client
      .put(`/api/v1/comments/${commentId}`)
      .header('Cookie', token)
      .json(updateData)

    response.assertStatus(200)
    assert.properties(response.body(), ['id', 'content', 'userId', 'reviewId', 'createdAt', 'updatedAt'])
    assert.equal(response.body().id, commentId)
    assert.equal(response.body().content, updateData.content)
  })

  test('fail to update comment with invalid data', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)
    const commentId = await createTestComment(client, token, reviewId)

    const invalidUpdateData = {
      content: '', // Invalid: empty content
    }

    const response = await client
      .put(`/api/v1/comments/${commentId}`)
      .header('Cookie', token)
      .json(invalidUpdateData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation error')
    assert.isArray(response.body().errors)
    const contentError = response.body().errors.find((err: any) => err.path.includes('content'))
    assert.exists(contentError)
  })

  test('fail to update comment without authentication', async ({ client }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)
    const commentId = await createTestComment(client, token, reviewId)

    const updateData = {
      content: 'Attempt to update without auth',
    }

    const response = await client.put(`/api/v1/comments/${commentId}`).json(updateData)

    response.assertStatus(401)
  })

  test('fail to update non-existent comment', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const nonExistentId = 'cl1234567890abcdef' // Using a CUID-like format

    const updateData = {
      content: 'Attempt to update non-existent comment',
    }

    const response = await client
      .put(`/api/v1/comments/${nonExistentId}`)
      .header('Cookie', token)
      .json(updateData)

    response.assertStatus(404)
    assert.equal(response.body().message, 'Comment not found')
  })

  test('fail to update comment of another user', async ({ client, assert }) => {
    const userToken = await getUserToken(client)
    const reviewId = await getReviewId(client, userToken)
    const commentId = await createTestComment(client, userToken, reviewId)

    const adminToken = await getAdminToken(client)

    const updateData = {
      content: 'Attempt to update other user\'s comment',
    }

    const response = await client
      .put(`/api/v1/comments/${commentId}`)
      .header('Cookie', adminToken)
      .json(updateData)

    response.assertStatus(403)
    assert.equal(response.body().message, 'You do not have permission to update this comment')
  })

  test('successfully revert comment flag', async ({ client, assert }) => {
    const adminToken = await getAdminToken(client)
    const userToken = await getUserToken(client)
    const reviewId = await getReviewId(client, userToken)
    const commentId = await createTestComment(client, userToken, reviewId)

    // First, flag the comment (assuming there's an endpoint to do this)
    await client.put(`/api/v1/comments/${commentId}/flag`).header('Cookie', adminToken).json({ flag: 'INAPPROPRIATE_LANGUAGE' })

    const response = await client
      .put(`/api/v1/comments/${commentId}/revert`)
      .header('Cookie', adminToken)

    response.assertStatus(200)
    assert.equal(response.body().flag, 'NONE')
  })

  test('fail to revert comment flag without admin rights', async ({ client, assert }) => {
    const userToken = await getUserToken(client)
    const reviewId = await getReviewId(client, userToken)
    const commentId = await createTestComment(client, userToken, reviewId)

    const response = await client
      .put(`/api/v1/comments/${commentId}/revert`)
      .header('Cookie', userToken)

    response.assertStatus(403)
    assert.equal(response.body().message, 'Admin rights required')
  })
})
