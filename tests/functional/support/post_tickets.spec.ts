import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Support Controller - POST Operations', () => {
  async function loginAsAdmin(client: ApiClient) {
    const response = await client.post('/api/v1/login').json({
      email: 'admin@example.com',
      password: 'password',
    })
    return response.headers()['set-cookie'][0]
  }

  test('unauthenticated user can create a support ticket', async ({ client, assert }) => {
    const response = await client.post('/api/v1/support/ticket').json({
      email: 'normalUser@example.com',
      title: 'Test Ticket',
      content: 'This is a test ticket',
      type: 'general',
    })

    response.assertStatus(201)
    response.assertBodyContains({ message: 'Support ticket created successfully' })
    assert.properties(response.body().ticket, [
      'id',
      'email',
      'title',
      'content',
      'status',
      'type',
      'createdAt',
      'updatedAt',
    ])
    assert.equal(response.body().ticket.email, 'normalUser@example.com')
    assert.equal(response.body().ticket.title, 'Test Ticket')
    assert.equal(response.body().ticket.content, 'This is a test ticket')
    assert.equal(response.body().ticket.type, 'general')
    assert.equal(response.body().ticket.status, 'todo')
  })

  test('fail to create ticket with invalid data', async ({ client }) => {
    const response = await client.post('/api/v1/support/ticket').json({
      // Missing required fields
    })

    response.assertStatus(400)
    //response.assertBodyContains({ message: 'Validation failed' })
    // Optionally, you can check for specific validation error messages
    // assert.include(response.body().errors[0].message, 'email is required')
  })

  //test('admin can send default email notification', async ({ client, assert }) => {
  //  const adminToken = await loginAsAdmin(client)
  //  const response = await client.post('/api/v1/support/email').header('Cookie', adminToken).json({
  //    email: 'normalUser@example.com',
  //  })
  //
  //  response.assertStatus(200)
  //  response.assertBodyContains({ message: 'Email sent successfully' })
  //})

  test('unauthenticated user cannot send default email notification', async ({ client }) => {
    const response = await client.post('/api/v1/support/email').json({
      email: 'normalUser@example.com',
    })

    response.assertStatus(401)
  })
})
