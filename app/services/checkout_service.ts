import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import StripeFacade from '#integrations/stripe/stripe_facade'
import RepoService from '#services/repo_service'
import OrderService from '#services/order_service'
import SellerService from '#services/seller_service'
import SalesService from '#services/sales_service'
import { Prisma, OrderStatus } from '@prisma/client'
import { z } from 'zod'

const initCheckoutSchema = z.object({
  repoId: z.string()
})

const processPaymentSchema = z.object({
  paymentIntentId: z.string(),
})

@inject()
export default class CheckoutService {
  constructor(
    protected stripeFacade: StripeFacade,
    protected repoService: RepoService,
    protected orderService: OrderService,
    protected sellerService: SellerService,
    protected salesService: SalesService
  ) {}

  /**
   * Initialize the checkout process for a repo
   * @param repoId - The ID of the repo being purchased
   * @param userId - The ID of the user making the purchase
   * @param customerId - The Stripe customer ID of the user
   * @returns An object containing the Stripe client secret
   */
  public async initCheckout(repoId: string, userId: string) {
    // check if repo exist
    const repoInfo = await this.repoService.getRepoById(repoId)

    if (!repoInfo) {
      throw new Error('Repo not found or seller profile not available')
    }

    // check if repo seller is verified
    const isSellerVerified = await this.sellerService.checkIfSellerVerified(repoInfo.userId)


    if (!isSellerVerified) {
      throw new Error('Repo not found or seller profile not available')
    }

    if (repoInfo.userId === userId) {
      throw new Error('You cannot purchase your own repo')
    }

    // create order
    
    const paymentIntent = await this.stripeFacade.createPaymentIntentForRepo(
      repoInfo.price,
      'MYR', // Default currency
      repoInfo.userId,
      repoInfo.id
    )

    await this.orderService.createOrder({
      userId: userId,
      repoId: paymentIntent.metadata.repoId,
      amount: paymentIntent.amount,
      status: OrderStatus.REQUIRESACTION,
      stripePaymentIntentId: paymentIntent.id,
    })

    return { clientSecret: paymentIntent.client_secret }
  }

  /**
   * Process a successful payment
   * @param paymentIntentId - The ID of the Stripe payment intent
   * @param tx - Prisma transaction client
   * @returns An object indicating success and the order ID
   */
  public async processPayment(paymentIntentId: string, tx: Prisma.TransactionClient) {
    const { paymentIntentId: validatedPaymentIntentId } = processPaymentSchema.parse({ paymentIntentId })

    const paymentIntent = await this.stripeFacade.retrievePaymentIntent(validatedPaymentIntentId)
    if (!paymentIntent) {
      throw new Error('Payment intent not found')
    }

    // get order by intent id
    const order = await this.orderService.getOrderByStripePaymentIntentId(paymentIntentId)
    if (!order) {
      throw new Error('Order not found')
    }

    // get repo seller
    const repo = await this.repoService.getRepoById(order.codeRepoId)
    if (!repo) {
      throw new Error('Repo not found')
    }

    const sellerProfile = await this.sellerService.getSellerProfile(repo.userId)

    if (sellerProfile === null) {
      throw new Error('seller not available')
    }

    await this.orderService.updateOrderStatus(order.id, OrderStatus.SUCCEEDED, tx)

    await this.sellerService.updateBalance(sellerProfile.id, order.totalAmount, tx)
    await this.salesService.updateSalesAggregate(repo.userId, order.totalAmount, tx)
    
    const accessGranted = await this.repoService.grantAccess(order.codeRepoId, order.userId, tx)
    if (!accessGranted) {
      throw new Error('Failed to grant access to the repo')
    }

    return { success: true, orderId: order.id }
  }
}
