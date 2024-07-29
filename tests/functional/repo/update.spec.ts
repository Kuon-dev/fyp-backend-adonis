import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'

test.group('Repository Update and Delete', () => {
  async function getSellerToken(client: ApiClient): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'verifiedSeller@example.com',
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

  async function createTestRepo(client: ApiClient, token: string): Promise<string> {
    const repoData = {
      name: 'Test Repo for Update/Delete' + Math.random().toString(36).substring(7),
      description: 'A test repository',
      language: 'JSX',
      price: 0,
      tags: ['redux', 'react'],
    }
    const response = await client.post('/api/v1/repo').header('Cookie', token).json(repoData)
    return response.body().id
  }

  test('successfully update a repository', async ({ client, assert }) => {
    const token = await getSellerToken(client)
    const repoId = await createTestRepo(client, token)

    const updateData = {
      name: 'Updated Test Repo',
      description: 'An updated test repository',
      price: 10,
      tags: ['react'],
    }

    const response = await client
      .put(`/api/v1/repo/${repoId}`)
      .header('Cookie', token)
      .json(updateData)

    response.assertStatus(200)
    assert.properties(response.body(), ['id', 'name', 'description', 'language', 'price', 'status'])
    assert.equal(response.body().name, updateData.name)
    assert.equal(response.body().description, updateData.description)
    assert.equal(response.body().price, updateData.price)
    assert.includeMembers(
      response.body().tags.map((t: any) => t.tag.name),
      updateData.tags
    )
  })

  test('fail to update repository with invalid data', async ({ client, assert }) => {
    const token = await getSellerToken(client)
    const repoId = await createTestRepo(client, token)

    const invalidUpdateData = {
      name: '', // Invalid: empty name
      price: -1, // Invalid: negative price
    }

    const response = await client
      .put(`/api/v1/repo/${repoId}`)
      .header('Cookie', token)
      .json(invalidUpdateData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation error')
    assert.isArray(response.body().errors)
    const nameError = response.body().errors.find((err: any) => err.path.includes('name'))
    assert.exists(nameError)
    const priceError = response.body().errors.find((err: any) => err.path.includes('price'))
    assert.exists(priceError)
  })

  test('fail to update repository without authentication', async ({ client }) => {
    const response = await client.put('/api/v1/repo/someId').json({ name: 'Updated Repo' })
    response.assertStatus(401)
  })

  test('fail to delete non-existent repository', async ({ client, assert }) => {
    const token = await getSellerToken(client)
    const nonExistentId = 'non_existent_id'

    const response = await client.delete(`/api/v1/repo/${nonExistentId}`).header('Cookie', token)

    response.assertStatus(404)
    //assert.equal(response.body().message, 'Repo not found')
  })

  test('fail to delete repository without authentication', async ({ client }) => {
    const response = await client.delete('/api/v1/repo/someId')
    response.assertStatus(401)
  })

  test('successfully soft delete a repository', async ({ client, assert }) => {
    const token = await getAdminToken(client)
    const repoId = await createTestRepo(client, token)

    const response = await client.delete(`/api/v1/repo/${repoId}`).header('Cookie', token)
    response.assertStatus(200)
    assert.equal(response.body().message, 'Repo deleted successfully')

    // Verify the repo is soft deleted
    const getResponse = await client.get(`/api/v1/repo/${repoId}`).header('Cookie', token)
    getResponse.assertStatus(404)
  })

  test('attempt to soft delete an already deleted repository', async ({ client, assert }) => {
    const token = await getAdminToken(client)
    const repoId = await createTestRepo(client, token)

    // Soft delete the repository
    await client.delete(`/api/v1/repo/${repoId}`).header('Cookie', token)

    // Attempt to soft delete again
    const response = await client.delete(`/api/v1/repo/${repoId}`).header('Cookie', token)
    response.assertStatus(404)
    //assert.equal(response.body().message, 'Repo not found or already deleted')
  })
})
