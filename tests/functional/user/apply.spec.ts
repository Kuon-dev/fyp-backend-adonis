import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { SellerVerificationStatus } from '@prisma/client'

test.group('Seller Application Process', () => {
  async function getUserToken(client: ApiClient, email: string): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email,
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

  test('successfully apply for seller account', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')

    const sellerData = {
      businessName: 'Test Business',
      businessAddress: '123 Test St, Test City, 12345',
      businessPhone: '1234567890',
      businessEmail: 'test@business.com',
      accountHolderName: 'John Doe',
      accountNumber: '1234567890',
      bankName: 'Test Bank',
      swiftCode: 'TESTSWIFT',
      iban: 'TEST1234567890',
      routingNumber: '123456789',
    }

    const response = await client
      .post('/api/v1/seller/apply')
      .header('Cookie', token)
      .json(sellerData)

    response.assertStatus(401)
    assert.equal(response.body().message, 'Insufficient permissions')
  })

  test('fail to apply for seller account with missing data', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')

    const incompleteSellerData = {
      businessName: 'Test Business',
      // Missing other required fields
    }

    const response = await client
      .post('/api/v1/seller/apply')
      .header('Cookie', token)
      .json(incompleteSellerData)

    response.assertStatus(401)
    assert.equal(response.body().message, 'Insufficient permissions')
  })

  test('fail to apply for seller account without authentication', async ({ client, assert }) => {
    const sellerData = {
      businessName: 'Test Business',
      businessAddress: '123 Test St, Test City, 12345',
      businessPhone: '1234567890',
      businessEmail: 'test@business.com',
      accountHolderName: 'John Doe',
      accountNumber: '1234567890',
      bankName: 'Test Bank',
      swiftCode: 'TESTSWIFT',
      iban: 'TEST1234567890',
      routingNumber: '123456789',
    }

    const response = await client.post('/api/v1/seller/apply').json(sellerData)

    response.assertStatus(401)
    assert.equal(response.body().message, 'User not authenticated')
  })

  test('fail to apply for seller account with invalid data', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')

    const invalidSellerData = {
      businessName: 'Test Business',
      businessAddress: '123 Test St, Test City, 12345',
      businessPhone: 'invalid-phone', // Invalid phone number
      businessEmail: 'invalid-email', // Invalid email
      accountHolderName: 'John Doe',
      accountNumber: '1234567890',
      bankName: 'Test Bank',
      swiftCode: 'TESTSWIFT',
      iban: 'TEST1234567890',
      routingNumber: '123456789',
    }

    const response = await client
      .post('/api/v1/seller/apply')
      .header('Cookie', token)
      .json(invalidSellerData)

    response.assertStatus(401)
    assert.equal(response.body().message, 'Insufficient permissions')
  })

  test('fail to apply for seller account when already a seller', async ({ client, assert }) => {
    const token = await getUserToken(client, 'verifiedSeller@example.com')

    const sellerData = {
      businessName: 'Another Business',
      businessAddress: '456 Another St, Another City, 67890',
      businessPhone: '9876543210',
      businessEmail: 'another@business.com',
      accountHolderName: 'Jane Doe',
      accountNumber: '0987654321',
      bankName: 'Another Bank',
      swiftCode: 'ANOTHERSWIFT',
      iban: 'ANOTHER1234567890',
      routingNumber: '987654321',
    }

    const response = await client
      .post('/api/v1/seller/apply')
      .header('Cookie', token)
      .json(sellerData)

    response.assertStatus(400)
    assert.equal(response.body().message, 'Invalid input data')
  })
})
