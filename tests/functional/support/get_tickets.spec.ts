import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Support Controller - GET Operations', () => {
  async function loginAsAdmin(client: ApiClient) {
    const response = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password',
    })
    return response.headers()['set-cookie'][0]
  }

  async function loginAsUser(client: ApiClient) {
    const response = await client.post('/api/v1/login').json({
      email: 'normalUser@example.com',
      password: 'password',
    })
    return response.headers()['set-cookie'][0]
  }

  //test('admin can get paginated support tickets', async ({ client, assert }) => {
  //  const adminToken = await loginAsAdmin(client)
  //  const response = await client
  //    .get('/api/v1/support/tickets/paginated')
  //    .header('Cookie', adminToken)
  //    .qs({ page: 1, limit: 10 })
  //
  //  response.assertStatus(200)
  //  assert.properties(response.body(), ['data', 'meta'])
  //  assert.isArray(response.body().data)
  //  assert.properties(response.body().meta, ['total', 'page', 'pageSize', 'lastPage'])
  //
  //  for (const ticket of response.body().data) {
  //    assert.properties(ticket, ['id', 'email', 'title', 'content', 'status', 'type', 'createdAt', 'updatedAt'])
  //  }
  //})

  test('admin can get all support tickets', async ({ client, assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client.get('/api/v1/support/tickets').header('Cookie', adminToken)

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets'])
    assert.isArray(response.body().tickets)

    for (const ticket of response.body().tickets) {
      assert.properties(ticket, [
        'id',
        'email',
        'title',
        'content',
        'status',
        'type',
        'createdAt',
        'updatedAt',
      ])
    }
  })

  test('admin can get support ticket by ID', async ({ client, assert }) => {
    const adminToken = await loginAsAdmin(client)
    const allTicket = await client.get('/api/v1/support/tickets').header('Cookie', adminToken)
    const ticketId = allTicket.body().tickets[0].id
    const response = await client
      .get(`/api/v1/support/ticket/${ticketId}`)
      .header('Cookie', adminToken)

    response.assertStatus(200)
    assert.properties(response.body(), [
      'id',
      'email',
      'title',
      'content',
      'status',
      'type',
      'createdAt',
      'updatedAt',
    ])
  })

  test('admin can get support tickets by title', async ({ client, assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/tickets/title')
      .header('Cookie', adminToken)
      .qs({ title: 'Test Ticket' })

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets'])
    assert.isArray(response.body().tickets)

    for (const ticket of response.body().tickets) {
      assert.include(ticket.title.toLowerCase(), 'test ticket')
    }
  })

  test('admin can get support tickets by email', async ({ client, assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/tickets/email')
      .header('Cookie', adminToken)
      .qs({ email: 'user@example.com' })

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets'])
    assert.isArray(response.body().tickets)

    for (const ticket of response.body().tickets) {
      assert.equal(ticket.email, 'user@example.com')
    }
  })

  test('admin can get support tickets by status', async ({ client, assert }) => {
    const adminToken = await loginAsAdmin(client)
    const response = await client
      .get('/api/v1/support/tickets/status')
      .header('Cookie', adminToken)
      .qs({ status: 'todo' })

    response.assertStatus(200)
    assert.properties(response.body(), ['tickets'])
    assert.isArray(response.body().tickets)

    for (const ticket of response.body().tickets) {
      assert.equal(ticket.status, 'todo')
    }
  })

  test('non-admin user cannot access support tickets', async ({ client, assert }) => {
    const userToken = await loginAsUser(client)
    const response = await client.get('/api/v1/support/tickets').header('Cookie', userToken)

    response.assertStatus(401)
    //assert.equal(response.body().message, 'Access denied')
  })

  test('unauthenticated user cannot access support tickets', async ({ client }) => {
    const response = await client.get('/api/v1/support/tickets')

    response.assertStatus(401)
    //response.assertBodyContains({ message: 'Authentication required' })
  })
})
