import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Support Controller - PUT and DELETE Operations', () => {

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

  test('admin can update support ticket status', async ({ client, assert }) => {
    const adminToken = await loginAsAdmin(client)
    const allTicket = await client.get('/api/v1/support/tickets').header('Cookie', adminToken)
    const ticketId = allTicket.body().tickets[0].id

    const response = await client
      .put(`/api/v1/support/ticket/${ticketId}`)
      .header('Cookie', adminToken)
      .json({
        status: 'done',
      })

    response.assertStatus(200)
    assert.properties(response.body().ticket, ['id', 'email', 'title', 'content', 'status', 'type', 'createdAt', 'updatedAt'])
    assert.equal(response.body().ticket.status, 'done')
  })

  test('admin cannot update ticket with invalid status', async ({ client }) => {
    const adminToken = await loginAsAdmin(client)
    const allTicket = await client.get('/api/v1/support/tickets').header('Cookie', adminToken)
    const ticketId = allTicket.body().tickets[0].id

    const response = await client
      .put(`/api/v1/support/ticket/${ticketId}`)
      .header('Cookie', adminToken)
      .json({
        status: 'invalid_status',
      })

    response.assertStatus(400)
    //response.assertBodyContains({ message: 'Invalid status provided' })
  })

  test('non-admin user cannot update support ticket', async ({ client }) => {
    const userToken = await loginAsUser(client)

    const adminToken = await loginAsAdmin(client)
    const allTicket = await client.get('/api/v1/support/tickets').header('Cookie', adminToken)
    const ticketId = allTicket.body().tickets[0].id

    const response = await client
      .put(`/api/v1/support/ticket/${ticketId}`)
      .header('Cookie', userToken)
      .json({
        status: 'done',
      })

    response.assertStatus(401)
    //response.assertBodyContains({ message: 'Access denied' })
  })

  test('unauthenticated user cannot update support ticket', async ({ client }) => {

    const adminToken = await loginAsAdmin(client)
    const allTicket = await client.get('/api/v1/support/tickets').header('Cookie', adminToken)
    const ticketId = allTicket.body().tickets[0].id

    const response = await client
      .put(`/api/v1/support/ticket/${ticketId}`)
      .json({
        status: 'done',
      })

    response.assertStatus(401)
    //response.assertBodyContains({ message: 'Authentication required' })
  })

  //test('admin can delete support ticket', async ({ client }) => {
  //  const adminToken = await loginAsAdmin(client)
  //  const ticketId = 'someValidTicketId' // Replace with a valid ticket ID
  //  const response = await client
  //    .delete(`/api/v1/support/ticket/${ticketId}`)
  //    .header('Cookie', adminToken)
  //
  //  response.assertStatus(200)
  //  response.assertBodyContains({ message: 'Ticket deleted successfully' })
  //})
  //
  //test('non-admin user cannot delete support ticket', async ({ client }) => {
  //  const userToken = await loginAsUser(client)
  //  const ticketId = 'someValidTicketId' // Replace with a valid ticket ID
  //  const response = await client
  //    .delete(`/api/v1/support/ticket/${ticketId}`)
  //    .header('Cookie', userToken)
  //
  //  response.assertStatus(403)
  //  response.assertBodyContains({ message: 'Access denied' })
  //})
  //
  //test('unauthenticated user cannot delete support ticket', async ({ client }) => {
  //  const ticketId = 'someValidTicketId' // Replace with a valid ticket ID
  //  const response = await client.delete(`/api/v1/support/ticket/${ticketId}`)
  //
  //  response.assertStatus(401)
  //  response.assertBodyContains({ message: 'Authentication required' })
  //})
})
