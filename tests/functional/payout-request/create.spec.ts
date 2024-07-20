import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { PayoutRequestStatus, SellerVerificationStatus } from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'

const COOLDOWN_PERIOD_DAYS = 7

test.group('Payout Request Creation', () => {
  async function getAuthToken(client: ApiClient, email: string = 'verifiedSeller@example.com'): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email,
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  async function updateSellerProfile(email: string, daysAgo: number, balance: number) {
    const seller = await prisma.user.findUnique({
      where: { email },
      include: { sellerProfile: true },
    })
    if (!seller || !seller.sellerProfile) {
      throw new Error('Verified seller not found')
    }
    const lastPayoutDate = DateTime.utc().minus({ days: daysAgo }).startOf('day').toJSDate()
    await prisma.sellerProfile.update({
      where: { id: seller.sellerProfile.id },
      data: {
        lastPayoutDate: lastPayoutDate,
        balance: balance
      },
    })
    console.log(`Updated seller profile: Last payout date set to ${lastPayoutDate}, balance set to ${balance}`)
    return seller.sellerProfile.id
  }

  test('fail to create payout request within cooldown period', async ({ client, assert }) => {
    const token = await getAuthToken(client)

    const sellerProfileId = await updateSellerProfile('verifiedSeller@example.com', COOLDOWN_PERIOD_DAYS - 1, 1000)

    const payoutRequestData = {
      totalAmount: 500,
    }

    const response = await client
      .post('/api/v1/seller/payout-requests')
      .header('Cookie', token)
      .json(payoutRequestData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Cooldown period has not elapsed since last payout request')

    const updatedSellerProfile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
    })
    console.log('Current seller profile state:', updatedSellerProfile)
  })

  test('successfully create payout request just after cooldown period', async ({ client, assert }) => {
    const token = await getAuthToken(client)

    const sellerProfileId = await updateSellerProfile('verifiedSeller@example.com', COOLDOWN_PERIOD_DAYS, 1000)

    const payoutRequestData = {
      totalAmount: 500,
    }

    const response = await client
      .post('/api/v1/seller/payout-requests')
      .header('Cookie', token)
      .json(payoutRequestData)

    response.assertStatus(201)
    assert.properties(response.body(), ['id', 'sellerProfileId', 'totalAmount', 'status', 'createdAt'])
    assert.equal(response.body().totalAmount, payoutRequestData.totalAmount)
    assert.equal(response.body().status, PayoutRequestStatus.PENDING)

    const updatedSellerProfile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
    })
    console.log('Current seller profile state:', updatedSellerProfile)
  })

  test('fail to create payout request with insufficient balance after cooldown period', async ({ client, assert }) => {
    const token = await getAuthToken(client)

    const sellerProfileId = await updateSellerProfile('verifiedSeller@example.com', COOLDOWN_PERIOD_DAYS + 1, 100)

    const payoutRequestData = {
      totalAmount: 500, // Higher than the balance of 100
    }

    const response = await client
      .post('/api/v1/seller/payout-requests')
      .header('Cookie', token)
      .json(payoutRequestData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Requested amount exceeds available balance')

    const updatedSellerProfile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
    })
    console.log('Current seller profile state:', updatedSellerProfile)
  })

  // =============================================

  test('fail to create payout request with invalid data', async ({ client, assert }) => {
    const token = await getAuthToken(client)

    // Ensure the cooldown period has passed
    await updateSellerProfile('verifiedSeller@example.com', 8, 1000)

    const invalidPayoutRequestData = {
      totalAmount: -100, // Invalid: negative amount
    }

    const response = await client
      .post('/api/v1/seller/payout-requests')
      .header('Cookie', token)
      .json(invalidPayoutRequestData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Validation error')
  })

  test('fail to create payout request as non-seller user', async ({ client, assert }) => {
    const token = await getAuthToken(client, 'normalUser@example.com')

    const payoutRequestData = {
      totalAmount: 100,
    }

    const response = await client
      .post('/api/v1/seller/payout-requests')
      .header('Cookie', token)
      .json(payoutRequestData)

    response.assertStatus(401)
  })

  test('fail to create payout request without authentication', async ({ client, assert }) => {
    const payoutRequestData = {
      totalAmount: 100,
    }

    const response = await client
      .post('/api/v1/seller/payout-requests')
      .json(payoutRequestData)

    response.assertStatus(401)
    assert.equal(response.body().message, 'User not authenticated')
  })
})
