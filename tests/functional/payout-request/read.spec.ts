import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { PayoutRequestStatus, SellerVerificationStatus } from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'

test.group('Payout Request Read Operations', () => {
  async function getAuthToken(
    client: ApiClient,
    email: string = 'verifiedSeller@example.com'
  ): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email,
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  async function createTestPayoutRequest(userId: string) {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } })
    if (!sellerProfile) throw new Error('Seller profile not found')

    return prisma.payoutRequest.create({
      data: {
        sellerProfileId: sellerProfile.id,
        totalAmount: 100,
        status: PayoutRequestStatus.PENDING,
      },
    })
  }

  test('successfully get a payout request by ID', async ({ client, assert }) => {
    const token = await getAuthToken(client)
    const user = await prisma.user.findUnique({ where: { email: 'verifiedSeller@example.com' } })
    if (!user) throw new Error('Test user not found')

    const payoutRequest = await createTestPayoutRequest(user.id)

    const response = await client
      .get(`/api/v1/payout-requests/${payoutRequest.id}`)
      .header('Cookie', token)

    response.assertStatus(200)
    assert.properties(response.body(), [
      'id',
      'sellerProfileId',
      'totalAmount',
      'status',
      'createdAt',
    ])
    assert.equal(response.body().id, payoutRequest.id)
    assert.equal(response.body().totalAmount, payoutRequest.totalAmount)
    assert.equal(response.body().status, PayoutRequestStatus.PENDING)
  })

  test('fail to get a non-existent payout request', async ({ client, assert }) => {
    const token = await getAuthToken(client)
    const nonExistentId = 'non-existent-id'

    const response = await client
      .get(`/api/v1/payout-requests/${nonExistentId}`)
      .header('Cookie', token)

    response.assertStatus(400)
    assert.equal(response.body().message, 'PayoutRequest not found')
  })

  test('successfully get current user payout requests', async ({ client, assert }) => {
    const token = await getAuthToken(client)
    const user = await prisma.user.findUnique({ where: { email: 'verifiedSeller@example.com' } })
    if (!user) throw new Error('Test user not found')

    // Create payout requests for the current user
    await createTestPayoutRequest(user.id)
    await createTestPayoutRequest(user.id)

    const response = await client
      .get('/api/v1/payout-requests/user/current')
      .header('Cookie', token)

    response.assertStatus(200)
    assert.isArray(response.body())
    assert.isNotEmpty(response.body())
    assert.properties(response.body()[0], [
      'id',
      'sellerProfileId',
      'totalAmount',
      'status',
      'createdAt',
    ])
  })

  test('fail to get payout requests without authentication', async ({ client }) => {
    const response = await client.get('/api/v1/payout-requests/user/current')

    response.assertStatus(401)
    response.assertBodyContains({ message: 'User not authenticated' })
  })

  test('successfully get all payout requests (admin only)', async ({ client, assert }) => {
    const token = await getAuthToken(client, 'admin@example.com') // Assuming admin role is required
    const user = await prisma.user.findUnique({ where: { email: 'verifiedSeller@example.com' } })
    if (!user) throw new Error('Test user not found')

    // Create payout requests
    await createTestPayoutRequest(user.id)
    await createTestPayoutRequest(user.id)

    const response = await client.get('/api/v1/admin/payout-requests').header('Cookie', token)

    response.assertStatus(200)
    assert.isArray(response.body())
    assert.isNotEmpty(response.body())
    assert.properties(response.body()[0], [
      'id',
      'sellerProfileId',
      'totalAmount',
      'status',
      'createdAt',
    ])
  })

  test('fail to get all payout requests with non-admin user', async ({ client, assert }) => {
    const token = await getAuthToken(client) // Using regular seller account

    const response = await client.get('/api/v1/admin/payout-requests').header('Cookie', token)

    response.assertStatus(401) // Assuming 403 Forbidden for unauthorized access
  })
})
