import { prisma } from '#services/prisma_service'
import Stripe from 'stripe'
import { DateTime } from 'luxon'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

export class PayoutService {
  /**
   * Calculate the total amount to be paid out to a seller
   * @param sellerId The ID of the seller
   * @param startDate The start date of the payout period
   * @param endDate The end date of the payout period
   */
  async calculatePayoutAmount(sellerId: string, startDate: DateTime, endDate: DateTime): Promise<number> {
    const totalSales = await prisma.order.aggregate({
      where: {
        codeRepo: {
          userId: sellerId,
        },
        status: 'COMPLETED',
        createdAt: {
          gte: startDate.toJSDate(),
          lte: endDate.toJSDate(),
        },
      },
      _sum: {
        totalAmount: true,
      },
    })

    // Assuming a platform fee of 10%
    const platformFeePercentage = 0.1
    const payoutAmount = (totalSales._sum.totalAmount || 0) * (1 - platformFeePercentage)

    return payoutAmount
  }

  /**
   * Create a payout for a seller
   * @param sellerId The ID of the seller
   * @param amount The amount to be paid out
   * @param currency The currency of the payout
   */
  async createPayout(sellerId: string, amount: number, currency: string): Promise<Payout> {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
      include: { bankAccount: true },
    })

    if (!sellerProfile || !sellerProfile.bankAccount) {
      throw new Error('Seller profile or bank account not found')
    }

    // Create a payout record in the database
    const payout = await prisma.payout.create({
      data: {
        sellerProfileId: sellerProfile.id,
        amount,
        currency,
        status: 'PENDING',
      },
    })

    try {
      // Create a payout using Stripe
      const stripePayout = await stripe.payouts.create({
        amount: Math.round(amount * 100), // Stripe expects amounts in cents
        currency,
        method: 'standard',
        destination: sellerProfile.bankAccount.accountNumber,
        metadata: {
          payoutId: payout.id,
          sellerId: sellerId,
        },
      })

      // Update the payout record with the Stripe payout ID
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          stripePayoutId: stripePayout.id,
          status: 'PROCESSING',
        },
      })

      return payout
    } catch (error) {
      // If the Stripe payout fails, update the payout status to FAILED
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'FAILED' },
      })
      throw error
    }
  }

  /**
   * Get payout history for a seller
   * @param sellerId The ID of the seller
   * @param page The page number
   * @param limit The number of items per page
   */
  async getPayoutHistory(sellerId: string, page: number = 1, limit: number = 10): Promise<Payout[]> {
    const payouts = await prisma.payout.findMany({
      where: {
        sellerProfile: {
          userId: sellerId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return payouts
  }
}
