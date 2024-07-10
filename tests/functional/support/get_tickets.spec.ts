import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Support Controller - GET Operations', (group) => {
  let client: ApiClient

  group.setup(async () => {
    client = new ApiClient()
  })

  async function loginAsAdmin(client: ApiClient) {
    const response = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password'
    })
    return response.headers()['set-cookie'][0]
  }

  async function loginAsUser(client: ApiClient) {
    const response = await client.post('/api/v1/login').json({
      email: 'user@example.com',
      password: 'password'
    })
    return response.headers()['set-cookie'][0]
  }

  test('admin can get paginated support tickets', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/tickets')
      .header('Cookie', adminToken)
      .qs({ page: 1, limit: 10 })

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets'])
    assert.isArray(response.body().tickets)
  })

  test('admin can get all support tickets', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/tickets/all')
      .header('Cookie', adminToken)

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets', 'status'])
    assert.equal(response.body().status, 'success')
    assert.isArray(response.body().tickets)
  })

  test('admin can get support ticket by ID', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/ticket/1')
      .header('Cookie', adminToken)

    response.assertStatus(200)
    assert.properties(response.body(), ['ticket'])
  })

  test('admin can get support tickets by title', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/tickets/title')
      .header('Cookie', adminToken)
      .qs({ title: 'Test Ticket' })

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets'])
    assert.isArray(response.body().tickets)
  })

  test('admin can get support tickets by email', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/tickets/email')
      .header('Cookie', adminToken)
      .qs({ email: 'user@example.com' })

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets'])
    assert.isArray(response.body().tickets)
  })

  test('admin can get support tickets by status', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/tickets/status')
      .header('Cookie', adminToken)
      .qs({ status: 'open' })

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets'])
    assert.isArray(response.body().tickets)
  })

  test('non-admin user cannot access support tickets', async ({ assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .get('/api/v1/support/tickets')
      .header('Cookie', userToken)

    response.assertStatus(403)
    assert.properties(response.body(), ['message'])
    assert.equal(response.body().message, 'Access denied')
  })

  test('unauthenticated user cannot access support tickets', async ({ assert }) => {
    const response = await client.get('/api/v1/support/tickets')

    response.assertStatus(401)
    assert.properties(response.body(), ['message'])
    assert.equal(response.body().message, 'Authentication required')
  })
})
