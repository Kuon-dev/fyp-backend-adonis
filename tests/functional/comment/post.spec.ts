import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'

test.group('Comment Controller - POST Operations', () => {
  async function getUserToken(client: ApiClient): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'normalUser@example.com',
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  async function getReviewId(client: ApiClient, token: string): Promise<string> {
    // First, get a repo that the user has access to
    const reposResponse = await client.get('/api/v1/repos/accessed').header('Cookie', token)
    const repoId = reposResponse.body().accessibleRepos[0].id

    // Then, get a review for that repo
    const reviewsResponse = await client.get(`/api/v1/repo/${repoId}/reviews`).header('Cookie', token)
    return reviewsResponse.body().data[0].id
  }

  test('successfully create a comment', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)

    const commentData = {
      content: 'This is a test comment',
      reviewId: reviewId,
    }

    const response = await client
      .post('/api/v1/comments')
      .header('Cookie', token)
      .json(commentData)

    response.assertStatus(201)
    assert.properties(response.body(), ['id', 'content', 'userId', 'reviewId', 'createdAt', 'updatedAt'])
    assert.equal(response.body().content, commentData.content)
    assert.equal(response.body().reviewId, commentData.reviewId)
  })

  test('fail to create comment with invalid data', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)

    const invalidCommentData = {
      content: '', // Invalid: empty content
      reviewId: reviewId,
    }

    const response = await client
      .post('/api/v1/comments')
      .header('Cookie', token)
      .json(invalidCommentData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation error')
    assert.isArray(response.body().errors)
    const contentError = response.body().errors.find((err: any) => err.path.includes('content'))
    assert.exists(contentError)
  })

  test('fail to create comment without authentication', async ({ client }) => {
    const reviewId = await getReviewId(client, await getUserToken(client))
    const commentData = {
      content: 'This is a test comment',
      reviewId: reviewId,
    }

    const response = await client
      .post('/api/v1/comments')
      .json(commentData)

    response.assertStatus(401)
  })

  test('successfully upvote a comment', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)

    // Create a comment first
    const commentResponse = await client
      .post('/api/v1/comments')
      .header('Cookie', token)
      .json({ content: 'Comment to be upvoted', reviewId })

    const commentId = commentResponse.body().id

    const voteResponse = await client
      .post(`/api/v1/comments/${commentId}/upvote`)
      .header('Cookie', token)

    voteResponse.assertStatus(200)
    assert.properties(voteResponse.body(), ['id', 'content', 'userId', 'reviewId', 'upvotes', 'downvotes'])
    assert.equal(voteResponse.body().upvotes, 1)
  })

  test('successfully downvote a comment', async ({ client, assert }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)

    // Create a comment first
    const commentResponse = await client
      .post('/api/v1/comments')
      .header('Cookie', token)
      .json({ content: 'Comment to be downvoted', reviewId })

    const commentId = commentResponse.body().id

    const voteResponse = await client
      .post(`/api/v1/comments/${commentId}/downvote`)
      .header('Cookie', token)

    voteResponse.assertStatus(200)
    assert.properties(voteResponse.body(), ['id', 'content', 'userId', 'reviewId', 'upvotes', 'downvotes'])
    assert.equal(voteResponse.body().downvotes, 1)
  })

  test('fail to vote on non-existent comment', async ({ client }) => {
    const token = await getUserToken(client)
    const nonExistentCommentId = 'cl1234567890abcdef' // Using a CUID-like format

    const response = await client
      .post(`/api/v1/comments/${nonExistentCommentId}/upvote`)
      .header('Cookie', token)

    response.assertStatus(400)
  })

  test('fail to vote without authentication', async ({ client }) => {
    const token = await getUserToken(client)
    const reviewId = await getReviewId(client, token)
    const commentResponse = await client
      .post('/api/v1/comments')
      .header('Cookie', token)
      .json({ content: 'Comment for unauthenticated vote test', reviewId })
    const commentId = commentResponse.body().id

    const response = await client
      .post(`/api/v1/comments/${commentId}/upvote`)

    response.assertStatus(401)
  })
})
