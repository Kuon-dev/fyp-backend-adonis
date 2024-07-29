import { inject } from '@adonisjs/core'
import { PrismaTransactionalClient, prisma } from '#services/prisma_service'
import StripeFacade from '#integrations/stripe/stripe_facade'
import RepoService from '#services/repo_service'
import OrderService from '#services/order_service'
import SellerService from '#services/seller_service'
import SalesService from '#services/sales_service'
import { OrderStatus } from '@prisma/client'
import { z } from 'zod'
import RepoAccessService from '#services/repo_access_service'

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
    protected salesService: SalesService,
    protected repoAccessService: RepoAccessService
  ) {}

  /**
   * Initialize the checkout process for a repo
   * @param repoId - The ID of the repo being accessed
   * @param userId - The ID of the user requesting access
   * @returns An object containing either the Stripe client secret or a success message for free repos
   */
  public async initCheckout(repoId: string, userId: string) {
    const repoInfo = await this.repoService.getRepoById(repoId)
    if (!repoInfo) {
      throw new Error('Repo not found')
    }

    const isSellerVerified = await this.sellerService.checkIfSellerVerified(repoInfo.userId)
    if (!isSellerVerified) {
      throw new Error('Seller profile not available')
    }

    if (repoInfo.userId === userId) {
      throw new Error('You cannot access your own repo through checkout')
    }

    // Handle free repos
    if (repoInfo.price === 0) {
      return this.processFreeRepo(repoId, userId)
    }

    // Proceed with paid repo checkout
    const paymentIntent = await this.stripeFacade.createPaymentIntentForRepo(
      repoInfo.price,
      'MYR',
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
   * Process a free repo access
   * @param repoId - The ID of the free repo
   * @param userId - The ID of the user requesting access
   * @returns An object indicating success and the order ID
   */
  private async processFreeRepo(repoId: string, userId: string) {
    const order = await this.orderService.createOrder({
      userId: userId,
      repoId: repoId,
      amount: 0,
      status: OrderStatus.SUCCEEDED,
      stripePaymentIntentId: '', // Use an empty string instead of null
    })

    const tx = await prisma.$transaction(async (prismaClient) => {
      const accessGranted = await this.repoAccessService.grantAccess(
        userId,
        repoId,
        order.id,
        prismaClient as PrismaTransactionalClient
      )
      if (!accessGranted) {
        throw new Error('Failed to grant access to the free repo')
      }
      return accessGranted
    })

    if (!tx) {
      throw new Error('Transaction failed while processing free repo')
    }

    return { success: true, orderId: order.id, message: 'Access granted to free repo' }
  }

  /**
   * Process a successful payment
   * @param userId - The ID of the user making the payment
   * @param paymentIntentId - The ID of the Stripe payment intent
   * @param tx - Prisma transaction client
   * @returns An object indicating success and the order ID
   */
  public async processPayment(
    userId: string,
    paymentIntentId: string,
    tx: PrismaTransactionalClient
  ) {
    const { paymentIntentId: validatedPaymentIntentId } = processPaymentSchema.parse({
      paymentIntentId,
    })

    const paymentIntent = await this.stripeFacade.retrievePaymentIntent(validatedPaymentIntentId)
    if (!paymentIntent) {
      throw new Error('Payment intent not found')
    }

    const order = await this.orderService.getOrderByStripePaymentIntentId(paymentIntentId)
    if (!order) {
      throw new Error('Order not found')
    }

    const repo = await this.repoService.getRepoById(order.codeRepoId)
    if (!repo) {
      throw new Error('Repo not found')
    }

    const sellerProfile = await this.sellerService.getSellerProfile(repo.userId)
    if (sellerProfile === null) {
      throw new Error('Seller not available')
    }

    await this.orderService.updateOrderStatus(order.id, OrderStatus.SUCCEEDED, tx)
    await this.sellerService.updateBalance(sellerProfile.id, order.totalAmount, tx)
    await this.salesService.updateSalesAggregate(repo.userId, order.totalAmount, tx)

    const accessGranted = await this.repoAccessService.grantAccess(
      userId,
      order.codeRepoId,
      order.id,
      tx
    )
    if (!accessGranted) {
      throw new Error('Failed to grant access to the repo')
    }

    return { success: true, orderId: order.id }
  }
}
