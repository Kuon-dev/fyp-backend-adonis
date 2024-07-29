import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Repository Get Details', () => {
  async function getAuthToken(
    client: ApiClient,
    email: string = 'normalUser@example.com'
  ): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email,
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  //async function getSellerToken(client: ApiClient): Promise<string> {
  //  const loginResponse = await client.post('/api/v1/login').json({
  //    email: 'verifiedSeller@example.com',
  //    password: 'password',
  //  })
  //  return loginResponse.headers()['set-cookie'][0]
  //}

  async function createTestRepo(
    client: ApiClient,
    token: string,
    visibility: 'public' | 'private' = 'public'
  ): Promise<string> {
    const repoData = {
      name: `Test ${visibility} Repo`,
      description: `A test ${visibility} repository`,
      language: 'JSX',
      price: 10,
      tags: ['test', 'react'],
      visibility,
      sourceJs: 'console.log("Hello, World!");',
      sourceCss: 'body { color: blue; }',
    }
    const response = await client.post('/api/v1/repo').header('Cookie', token).json(repoData)
    return response.body().id
  }

  async function deleteTestRepo(client: ApiClient, token: string, repoId: string): Promise<void> {
    await client.delete(`/api/v1/repo/${repoId}`).header('Cookie', token)
  }

  async function createReview(
    client: ApiClient,
    token: string,
    repoId: string,
    rating: number
  ): Promise<void> {
    await client
      .post('/api/v1/reviews')
      .header('Cookie', token)
      .json({
        repoId,
        content: `This is a test review with rating ${rating}`,
        rating,
      })
  }

  test('successfully get public repository details when authenticated', async ({
    client,
    assert,
  }) => {
    const token = await getAuthToken(client)
    const repoId = await createTestRepo(client, token, 'public')

    try {
      const response = await client.get(`/api/v1/repo/${repoId}/public`).header('Cookie', token)

      response.assertStatus(200)
      assert.properties(response.body().repo, [
        'id',
        'name',
        'description',
        'language',
        'price',
        'visibility',
        'status',
        'tags',
      ])
      assert.equal(response.body().repo.visibility, 'public')
      assert.isArray(response.body().repo.tags)
      assert.include(
        response.body().repo.tags.map((t: any) => t.tag.name),
        'test'
      )
      assert.include(
        response.body().repo.tags.map((t: any) => t.tag.name),
        'react'
      )
    } finally {
      await deleteTestRepo(client, token, repoId)
    }
  })

  test('successfully get private repository details when owner', async ({ client, assert }) => {
    const token = await getAuthToken(client, 'verifiedSeller@example.com')
    const repoId = await createTestRepo(client, token, 'private')

    try {
      const response = await client.get(`/api/v1/repo/${repoId}`).header('Cookie', token)
      response.assertStatus(200)
      assert.properties(response.body().repo, [
        'id',
        'name',
        'description',
        'language',
        'price',
        'visibility',
        'status',
        'tags',
      ])
      assert.equal(response.body().repo.visibility, 'private')
      assert.exists(response.body().repo.sourceJs)
      assert.exists(response.body().repo.sourceCss)
    } finally {
      await deleteTestRepo(client, token, repoId)
    }
  })

  test('fail to get private repository details when not owner', async ({ client, assert }) => {
    const ownerToken = await getAuthToken(client, 'verifiedSeller@example.com')
    const userToken = await getAuthToken(client, 'normalUser@example.com')
    const repoId = await createTestRepo(client, ownerToken, 'private')

    try {
      const response = await client.get(`/api/v1/repo/${repoId}`).header('Cookie', userToken)

      response.assertStatus(403)
      //assert.equal(response.body().message, 'You do not have access to this repo')
    } finally {
      await deleteTestRepo(client, ownerToken, repoId)
    }
  })

  test('successfully get public repository details without authentication', async ({
    client,
    assert,
  }) => {
    const token = await getAuthToken(client)
    const repoId = await createTestRepo(client, token, 'public')

    try {
      const response = await client.get(`/api/v1/repo/${repoId}/public`)

      response.assertStatus(200)
      assert.properties(response.body().repo, [
        'id',
        'name',
        'description',
        'language',
        'price',
        'visibility',
        'tags',
      ])
      assert.equal(response.body().repo.visibility, 'public')
      assert.notExists(response.body().repo.sourceJs)
      assert.notExists(response.body().repo.sourceCss)
      assert.isArray(response.body().repo.tags)
    } finally {
      await deleteTestRepo(client, token, repoId)
    }
  })

  test('fail to get private repository details without authentication', async ({
    client,
    assert,
  }) => {
    const token = await getAuthToken(client)
    const repoId = await createTestRepo(client, token, 'private')

    try {
      const response = await client.get(`/api/v1/repo/${repoId}`)

      response.assertStatus(401)
      //assert.equal(response.body().message, 'Repo not found')
    } finally {
      await deleteTestRepo(client, token, repoId)
    }
  })

  test('fail to get non-existent repository', async ({ client, assert }) => {
    const token = await getAuthToken(client)
    const nonExistentId = 'non_existent_id'

    const response = await client.get(`/api/v1/repo/${nonExistentId}`).header('Cookie', token)

    response.assertStatus(404)
    assert.equal(response.body().message, 'Repo not found')
  })

  test('get repository details with paginated reviews', async ({ client, assert }) => {
    const token = await getAuthToken(client)
    const repoId = await createTestRepo(client, token, 'public')
    try {
      // Create multiple reviews
      for (let i = 1; i <= 15; i++) {
        await createReview(client, token, repoId, (i % 5) + 1)
      }

      const response = await client
        .get(`/api/v1/repo/${repoId}/reviews?page=1&limit=10`)
        .header('Cookie', token)

      response.assertStatus(200)
      assert.isArray(response.body().data)
      assert.equal(response.body().data.length, 0)
      assert.properties(response.body().meta, ['total', 'page', 'perPage', 'lastPage'])

      // Check if each review has the expected properties
      response.body().data.forEach((review: any) => {
        assert.properties(review, ['id', 'content', 'rating', 'userId', 'createdAt', 'updatedAt'])
      })
    } finally {
      await deleteTestRepo(client, token, repoId)
    }
  })

  test('verify sensitive information is not returned for public unauthenticated requests', async ({
    client,
    assert,
  }) => {
    const token = await getAuthToken(client)
    const repoId = await createTestRepo(client, token, 'public')
    try {
      const response = await client.get(`/api/v1/repo/${repoId}/public`)

      response.assertStatus(200)
      assert.exists(response.body().repo)
      assert.notExists(response.body().repo.sourceJs)
      assert.notExists(response.body().repo.sourceCss)
      assert.notExists(response.body().repo.userId)

      // Check for expected public properties
      assert.properties(response.body().repo, [
        'id',
        'name',
        'description',
        'language',
        'price',
        'visibility',
        'tags',
      ])

      // Verify that the repoCodeCheck is included but doesn't contain sensitive information
      //assert.exists(response.body().repoCodeCheck)
      //if (response.body().repoCodeCheck) {
        //assert.exist(response.body().repoCodeChekc)
        //assert.notExists(response.body().repoCodeCheck.sourceCss)
      //}
    } finally {
      await deleteTestRepo(client, token, repoId)
    }
  })

  test('check if tags are correctly returned with repository details', async ({client,assert}) => {
    const token = await getAuthToken(client)
    const repoId = await createTestRepo(client, token, 'public')

    try {
      const response = await client.get(`/api/v1/repo/${repoId}/public`).header('Cookie', token)

      response.assertStatus(200)
      assert.isArray(response.body().repo.tags)
      const tagNames = response.body().repo.tags.map((t: any) => t.tag.name)
      assert.includeMembers(tagNames, ['test', 'react'])
    } finally {
      await deleteTestRepo(client, token, repoId)
    }
  })

  test('verify admin can access private repository details', async ({ client, assert }) => {
    const userToken = await getAuthToken(client, 'normalUser@example.com')
    const adminToken = await getAuthToken(client, 'admin@example.com')
    const repoId = await createTestRepo(client, userToken, 'private')

    try {
      const response = await client.get(`/api/v1/repo/${repoId}`).header('Cookie', adminToken)

      response.assertStatus(200)
      assert.equal(response.body().repo.visibility, 'private')
      assert.exists(response.body().repo.sourceJs)
      assert.exists(response.body().repo.sourceCss)
    } finally {
      await deleteTestRepo(client, adminToken, repoId)
    }
  })
})
