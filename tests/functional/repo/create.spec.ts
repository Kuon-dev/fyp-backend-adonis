import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
//import { createRepoSchema } from '#validators/repo'

test.group('Repository Creation', () => {
  async function getAuthToken(client: ApiClient): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'normalUser@example.com',
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  test('successfully create a new repository', async ({ client, assert }) => {
    const repoData = {
      name: 'Test Repo' + Math.random(),
      description: 'A test repository',
      language: 'TSX',
      price: 0,
      tags: ['redux', 'react'],
      visibility: "public",
    }
    const token = await getAuthToken(client)

    const response = await client.post('/api/v1/repo').header('Cookie', token).json(repoData)

    response.assertStatus(201)
    assert.properties(response.body(), ['id', 'name', 'description', 'language', 'price', 'status'])
    assert.equal(response.body().name, repoData.name)
    assert.equal(response.body().description, repoData.description)
    assert.equal(response.body().language, repoData.language)
    assert.equal(response.body().price, repoData.price)
    assert.equal(response.body().status, 'pending')
  })

  test('fail to create repository with invalid data', async ({ client, assert }) => {
    const invalidRepoData = {
      name: '', // Invalid: empty name
      description: 'A test repository',
      language: 'InvalidLanguage', // Invalid: not in enum
      price: -1, // Invalid: negative price
      tags: ['test', 'react'],
    }
    const token = await getAuthToken(client)

    const response = await client.post('/api/v1/repo').header('Cookie', token).json(invalidRepoData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation error')
    assert.isArray(response.body().errors)

    const nameError = response.body().errors.find((err: any) => err.path.includes('name'))
    assert.exists(nameError)

    const languageError = response.body().errors.find((err: any) => err.path.includes('language'))
    assert.exists(languageError)

    const priceError = response.body().errors.find((err: any) => err.path.includes('price'))
    assert.exists(priceError)
  })

  test('fail to create repository without authentication', async ({ client }) => {
    const repoData = {
      name: 'Test Repo',
      description: 'A test repository',
      language: 'JSX',
      price: 0,
      tags: ['test', 'react'],
    }

    const response = await client.post('/api/v1/repo').json(repoData)

    response.assertStatus(401)
    //response.assertBodyContains({ message: 'User not authenticated' })
  })
})
