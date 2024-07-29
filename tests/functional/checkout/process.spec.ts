import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { prisma } from '#services/prisma_service'
import { SellerVerificationStatus, OrderStatus } from '@prisma/client'
import Stripe from 'stripe'
import env from '#start/env'

const stripe = new Stripe(env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-04-10',
})

test.group('Payment Processing', () => {
  async function getUserToken(client: ApiClient, email: string): Promise<string> {
    const loginResponse = await client.post('/api/v1/login').json({
      email,
      password: 'password',
    })
    return loginResponse.headers()['set-cookie'][0]
  }

const getRepoId = async (client: ApiClient, token: string, userId?: string): Promise<string> => {
  // Get the repositories the user has access to
  const repoAccess = await prisma.userRepoAccess.findMany({
    where: {
      userId,
    },
  });

  // Get all repositories that have not been deleted and are not yet purchased by the user
  const allRepos = await prisma.codeRepo.findMany({
    where: {
      deletedAt: null,
      orders: {
        none: {
          userId,
        },
      },
    },
    include: {
      orders: true, // Include orders to filter out purchased repos
    },
  });

  // Filter repositories to exclude those the user has access to
  const filteredRepos = allRepos.filter((repo) => {
    const hasAccess = repoAccess.some((ra) => ra.repoId === repo.id);
    return !hasAccess;
  });

  // Get a random repository from the filtered list
  const randomRepo = filteredRepos[Math.floor(Math.random() * filteredRepos.length)];

  return randomRepo.id;
};

  async function createTestPaymentIntent(): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.create({
      amount: 1000, // $10.00
      currency: 'myr',
      payment_method_types: ['card'],
    })
  }

  async function createOrder(userId: string, repoId: string, paymentIntentId: string): Promise<string> {
    const order = await prisma.order.create({
      data: {
        userId,
        codeRepoId: repoId,
        totalAmount: 1000, // $10.00
        status: OrderStatus.REQUIRESACTION,
        stripePaymentIntentId: paymentIntentId,
      },
    })
    return order.id
  }

  test('successfully process payment', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')
    const user = await prisma.user.findFirst({ where: { email: 'normalUser@example.com' } })
    if (!user) throw new Error('Test user not found')
    const repoId = await getRepoId(client, token, user.id)

    // Create a test PaymentIntent
    const paymentIntent = await createTestPaymentIntent()

    // Create an order
    await createOrder(user.id, repoId, paymentIntent.id)

    // Simulate successful payment confirmation on the frontend
    await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_visa',
    })

    // Process the payment on the server
    const response = await client
      .post('/api/v1/checkout/process-payment')
      .header('Cookie', token)
      .json({ paymentIntentId: paymentIntent.id })

    response.assertStatus(200)
    assert.properties(response.body(), ['success', 'orderId'])
    assert.isTrue(response.body().success)
    assert.isString(response.body().orderId)

    // Verify order update and repo access
    const order = await prisma.order.findUnique({
      where: { id: response.body().orderId },
    })
    assert.exists(order)
    assert.equal(order?.status, OrderStatus.SUCCEEDED)

    const access = await prisma.userRepoAccess.findFirst({
      where: {
        userId: user.id,
        repoId: repoId,
      },
    })
    assert.exists(access)

    // Clean up
    if (access) await prisma.userRepoAccess.delete({ where: { id: access.id } })
    if (order) await prisma.order.delete({ where: { id: order.id } })
  })

  test('fail to process payment for non-existent payment intent', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')
    const nonExistentPaymentIntentId = 'asdasdasdasd'

    const response = await client
      .post('/api/v1/checkout/process-payment')
      .header('Cookie', token)
      .json({ paymentIntentId: nonExistentPaymentIntentId })

    response.assertStatus(404) // Changed from 400 to 500
    assert.equal(response.body().message, 'Order not found')
  })

  test('fail to process payment without authentication', async ({ client, assert }) => {
    const paymentIntent = await createTestPaymentIntent()

    const response = await client
      .post('/api/v1/checkout/process-payment')
      .json({ paymentIntentId: paymentIntent.id })

    response.assertStatus(401)
    assert.equal(response.body().message, 'User not authenticated')
  })

  test('fail to process payment for already processed payment intent', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')
    const user = await prisma.user.findFirst({ where: { email: 'normalUser@example.com' } })
    if (!user) throw new Error('Test user not found')
    const repoId = await getRepoId(client, token, user.id)

    // Create and confirm a PaymentIntent
    const paymentIntent = await createTestPaymentIntent()
    await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_visa',
    })

    // Create an order
    const orderId = await createOrder(user.id, repoId, paymentIntent.id)

    // Process payment for the first time
    await client
      .post('/api/v1/checkout/process-payment')
      .header('Cookie', token)
      .json({ paymentIntentId: paymentIntent.id })

    // Try to process the same payment again
    const response = await client
      .post('/api/v1/checkout/process-payment')
      .header('Cookie', token)
      .json({ paymentIntentId: paymentIntent.id })

    console.log(response.body())
    response.assertStatus(409) // Changed from 400 to 409 (Conflict)
    assert.equal(response.body().message, 'Payment has already been processed')

    // Clean up
    await prisma.userRepoAccess.deleteMany({ where: { orderId: orderId } })
    await prisma.order.delete({ where: { id: orderId } })
  })

  // Add a new test for invalid input data
  test('fail to process payment with invalid input data', async ({ client, assert }) => {
    const token = await getUserToken(client, 'normalUser@example.com')

    const response = await client
      .post('/api/v1/checkout/process-payment')
      .header('Cookie', token)
      .json({ invalidKey: 'invalidValue' })

    response.assertStatus(400)
    assert.equal(response.body().message, 'Invalid input data')
  })
})
