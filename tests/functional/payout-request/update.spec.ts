//import { test } from '@japa/runner'
//import { ApiClient } from '@japa/api-client'
//import { PayoutRequestStatus, SellerVerificationStatus } from '@prisma/client'
//import { prisma } from '#services/prisma_service'
//
//test.group('Payout Request Update and Delete Operations', () => {
//  async function getAuthToken(client: ApiClient, email: string = 'admin@example.com'): Promise<string> {
//    const loginResponse = await client.post('/api/v1/login').json({
//      email,
//      password: 'password',
//    })
//    return loginResponse.headers()['set-cookie'][0]
//  }
//
//  async function createTestPayoutRequest() {
//    const seller = await prisma.user.findUnique({
//      where: { email: 'verifiedSeller@example.com' },
//      include: { sellerProfile: true },
//    })
//    if (!seller || !seller.sellerProfile) {
//      throw new Error('Verified seller not found')
//    }
//
//    return prisma.payoutRequest.create({
//      data: {
//        sellerProfileId: seller.sellerProfile.id,
//        totalAmount: 100,
//        status: PayoutRequestStatus.PENDING,
//      },
//    })
//  }
//
//  test('successfully update a payout request', async ({ client, assert }) => {
//    const token = await getAuthToken(client)
//    const payoutRequest = await createTestPayoutRequest()
//
//    const updateData = {
//      status: PayoutRequestStatus.PROCESSED,
//    }
//
//    const response = await client
//      .put(`/api/v1/payout-requests/${payoutRequest.id}`)
//      .header('Cookie', token)
//      .json(updateData)
//
//    response.assertStatus(200)
//    assert.properties(response.body(), ['id', 'sellerProfileId', 'totalAmount', 'status', 'createdAt', 'updatedAt'])
//    assert.equal(response.body().id, payoutRequest.id)
//    assert.equal(response.body().status, PayoutRequestStatus.PROCESSED)
//  })
//
//  test('fail to update a non-existent payout request', async ({ client, assert }) => {
//    const token = await getAuthToken(client)
//    const nonExistentId = 'non-existent-id'
//
//    const updateData = {
//      status: PayoutRequestStatus.PROCESSED,
//    }
//
//    const response = await client
//      .put(`/api/v1/payout-requests/${nonExistentId}`)
//      .header('Cookie', token)
//      .json(updateData)
//
//    response.assertStatus(400)
//    assert.equal(response.body().message, 'PayoutRequest not found')
//  })
//
//  test('fail to update a payout request with invalid data', async ({ client, assert }) => {
//    const token = await getAuthToken(client)
//    const payoutRequest = await createTestPayoutRequest()
//
//    const invalidUpdateData = {
//      status: 'INVALID_STATUS',
//    }
//
//    const response = await client
//      .put(`/api/v1/payout-requests/${payoutRequest.id}`)
//      .header('Cookie', token)
//      .json(invalidUpdateData)
//
//    response.assertStatus(400)
//    assert.equal(response.body().message, 'Validation error')
//  })
//
//  test('fail to update a payout request as non-admin user', async ({ client, assert }) => {
//    const token = await getAuthToken(client, 'verifiedSeller@example.com')
//    const payoutRequest = await createTestPayoutRequest()
//
//    const updateData = {
//      status: PayoutRequestStatus.PROCESSED,
//    }
//
//    const response = await client
//      .put(`/api/v1/payout-requests/${payoutRequest.id}`)
//      .header('Cookie', token)
//      .json(updateData)
//
//    response.assertStatus(403)
//    assert.equal(response.body().message, 'Access denied')
//  })
//
//  test('successfully delete a payout request', async ({ client, assert }) => {
//    const token = await getAuthToken(client)
//    const payoutRequest = await createTestPayoutRequest()
//
//    const response = await client
//      .delete(`/api/v1/payout-requests/${payoutRequest.id}`)
//      .header('Cookie', token)
//
//    response.assertStatus(200)
//    assert.equal(response.body().message, 'PayoutRequest deleted successfully')
//
//    // Verify that the payout request has been deleted
//    const deletedPayoutRequest = await prisma.payoutRequest.findUnique({
//      where: { id: payoutRequest.id },
//    })
//    assert.isNull(deletedPayoutRequest)
//  })
//
//  test('fail to delete a non-existent payout request', async ({ client, assert }) => {
//    const token = await getAuthToken(client)
//    const nonExistentId = 'non-existent-id'
//
//    const response = await client
//      .delete(`/api/v1/payout-requests/${nonExistentId}`)
//      .header('Cookie', token)
//
//    response.assertStatus(400)
//    assert.equal(response.body().message, 'PayoutRequest not found')
//  })
//
//  test('fail to delete a payout request as non-admin user', async ({ client, assert }) => {
//    const token = await getAuthToken(client, 'verifiedSeller@example.com')
//    const payoutRequest = await createTestPayoutRequest()
//
//    const response = await client
//      .delete(`/api/v1/payout-requests/${payoutRequest.id}`)
//      .header('Cookie', token)
//
//    response.assertStatus(403)
//    assert.equal(response.body().message, 'Access denied')
//  })
//})
