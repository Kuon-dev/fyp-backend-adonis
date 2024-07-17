import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import StripeFacade from '#integrations/stripe/stripe_facade'
import RepoService from '#services/repo_service'
import OrderService from '#services/order_service'
import SellerService from '#services/seller_service'
import SalesService from '#services/sales_service'
import { Prisma, OrderStatus } from '@prisma/client'

@inject()
export default class CheckoutService {
  constructor(
    protected stripeFacade: StripeFacade,
    protected repoService: RepoService,
    protected orderService: OrderService,
    protected sellerService: SellerService,
    protected salesService: SalesService
  ) {}

  public async initCheckout(repoId: string) {
    const repoInfo = await this.repoService.getRepoForCheckout(repoId)
    if (!repoInfo || !repoInfo.sellerProfileId) {
      throw new Error('Repo not found or seller profile not available')
    }

    const paymentIntent = await this.stripeFacade.createPaymentIntentForRepo(
      repoInfo.repo.price,
      'MYR', // Assuming MYR as default currency
      repoInfo.sellerProfileId,
      repoId
    )
    return { clientSecret: paymentIntent.client_secret }
  }

  public async processPayment(paymentIntentId: string, tx: Prisma.TransactionClient) {
    const paymentIntent = await this.stripeFacade.retrievePaymentIntent(paymentIntentId)
    if (!paymentIntent) {
      throw new Error('Payment intent not found')
    }
    const order = await this.orderService.createOrder({
      userId: paymentIntent.metadata.userId,
      repoId: paymentIntent.metadata.repoId,
      amount: paymentIntent.amount,
      status: OrderStatus.SUCCEEDED,
      stripePaymentIntentId: paymentIntentId,
    }, tx)
    
    const sellerId = paymentIntent.metadata.sellerId
    if (!sellerId) {
      throw new Error('Seller ID not found in payment intent metadata')
    }

    await this.sellerService.updateBalance(sellerId, order.totalAmount, tx)
    await this.salesService.updateSalesAggregate(sellerId, order.totalAmount, tx)
    
    const accessGranted = await this.repoService.grantAccess(order.codeRepoId, order.userId, tx)
    if (!accessGranted) {
      throw new Error('Failed to grant access to the repo')
    }

    return { success: true, orderId: order.id }
  }
}
