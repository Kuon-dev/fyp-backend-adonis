import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Auth Controller - Login', () => {
  async function getAuthToken(client: ApiClient) {
    const loginResponse = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  test('successfully login with valid credentials', async ({ client, assert }) => {
    const response = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password',
    })

    response.assertStatus(200)
    response.assertBodyContains({ message: 'Login successful' })
    assert.exists(response.headers()['set-cookie'])
  })

  test('fail to login with invalid credentials', async ({ client }) => {
    const response = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'wrongpassword',
    })

    response.assertStatus(400)
    response.assertBodyContains({ message: 'Invalid credentials' })
  })

  test('fail to login with missing fields', async ({ client }) => {
    const response = await client.post('/api/v1/login').json({
      email: 'testuser@example.com',
    })

    response.assertStatus(400)
    //response.assertBodyContains({ message: 'Emtpy fields on request body' })
  })

  test('login and access protected route', async ({ client }) => {
    const token = await getAuthToken(client)

    const response = await client.get('/api/v1/me').header('Cookie', token)

    response.assertStatus(200)
    //response.assertBodyContains({ message: 'Access granted' })
  })
})
