import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Support Controller - PUT and DELETE Operations', (group) => {
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

  async function loginAsUser(client: ApiClient) {
    const response = await client.post('/api/v1/login').json({
      email: 'user@example.com',
      password: 'userpassword'
    })
    return response.headers()['set-cookie'][0]
  }

  test('admin can update support ticket status', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .put('/api/v1/support/ticket/1')
      .header('Cookie', adminToken)
      .json({
        status: 'closed'
      })

    response.assertStatus(200)
    assert.properties(response.body(), ['ticket'])
    assert.equal(response.body().ticket.status, 'closed')
  })

  test('admin cannot update ticket with invalid status', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .put('/api/v1/support/ticket/1')
      .header('Cookie', adminToken)
      .json({
        status: 'invalid_status'
      })

    response.assertStatus(400)
    assert.properties(response.body(), ['message'])
  })

  test('non-admin user cannot update support ticket', async ({ assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .put('/api/v1/support/ticket/1')
      .header('Cookie', userToken)
      .json({
        status: 'closed'
      })

    response.assertStatus(403)
    assert.properties(response.body(), ['message'])
    assert.equal(response.body().message, 'Access denied')
  })

  test('unauthenticated user cannot update support ticket', async ({ assert }) => {
    const response = await client
      .put('/api/v1/support/ticket/1')
      .json({
        status: 'closed'
      })

    response.assertStatus(401)
    assert.properties(response.body(), ['message'])
    assert.equal(response.body().message, 'Authentication required')
  })

  // Assuming there's a DELETE operation, we can add tests for it here
  test('admin can delete support ticket', async ({ assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .delete('/api/v1/support/ticket/1')
      .header('Cookie', adminToken)

    response.assertStatus(200)
    assert.properties(response.body(), ['message'])
    assert.equal(response.body().message, 'Ticket deleted successfully')
  })

  test('non-admin user cannot delete support ticket', async ({ assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client
      .delete('/api/v1/support/ticket/1')
      .header('Cookie', userToken)

    response.assertStatus(403)
    assert.properties(response.body(), ['message'])
    assert.equal(response.body().message, 'Access denied')
  })

  test('unauthenticated user cannot delete support ticket', async ({ assert }) => {
    const response = await client.delete('/api/v1/support/ticket/1')

    response.assertStatus(401)
    assert.properties(response.body(), ['message'])
    assert.equal(response.body().message, 'Authentication required')
  })
})
