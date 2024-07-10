import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Support Controller - POST Operations', (group) => {
  let client: ApiClient

  group.setup(async () => {
    client = new ApiClient()
  })

  async function loginAsAdmin(client: ApiClient) {
    const response = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'adminpassword'
    })
    return response.headers()['set-cookie'][0]
  }

  test('unauthenticated user can create a support ticket', async ({ assert }) => {
    const response = await client.post('/api/v1/support/ticket').json({
      email: 'user@example.com',
      subject: 'Test Ticket',
      message: 'This is a test ticket',
      type: 'general'
    })

    response.assertStatus(201)
    response.assertBodyContains({ message: 'Support ticket created successfully' })
  })

  test('fail to create ticket with invalid data', async ({ assert }) => {
    const response = await client.post('/api/v1/support/ticket').json({
      // Missing required fields
    })

    response.assertStatus(400)
    assert.properties(response.body(), ['message'])
  })

  test('admin can send default email notification', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .post('/api/v1/support/send-email')
      .header('Cookie', adminToken)
      .json({
        email: 'user@example.com'
      })

    response.assertStatus(200)
    assert.properties(response.body(), ['message'])
  })

  test('unauthenticated user cannot send default email notification', async ({ assert }) => {
    const response = await client
      .post('/api/v1/support/send-email')
      .json({
        email: 'user@example.com'
      })

    response.assertStatus(401)
    assert.properties(response.body(), ['message'])
    assert.equal(response.body().message, 'Authentication required')
  })
})
