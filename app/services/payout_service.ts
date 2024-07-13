import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { PayoutStatus } from '@prisma/client'

@inject()
export default class PayoutService {
  /**
   * Create a new payout.
   * @param {Object} data - The payout data.
   * @returns {Promise<Payout>} The created payout.
   */
  public async createPayout(data: { sellerProfileId: string; amount: number; currency: string }) {
    return prisma.payout.create({
      data: {
        sellerProfileId: data.sellerProfileId,
        totalAmount: data.amount,
        currency: data.currency,
        status: PayoutStatus.PENDING,
      },
    })
  }

  /**
   * Get a payout by its ID.
   * @param {string} id - The payout ID.
   * @returns {Promise<Payout>} The payout.
   */
  public async getPayoutById(id: string) {
    const payout = await prisma.payout.findUnique({ where: { id } })
    if (!payout) {
      throw new Error('Payout not found')
    }
    return payout
  }

  /**
   * Update a payout's status.
   * @param {string} id - The payout ID.
   * @param {Object} data - The data to update.
   * @returns {Promise<Payout>} The updated payout.
   */
  public async updatePayout(id: string, data: { status: PayoutStatus }) {
    return prisma.payout.update({
      where: { id },
      data,
    })
  }

  /**
   * Get all payouts for a specific seller profile.
   * @param {string} sellerProfileId - The seller profile ID.
   * @returns {Promise<Payout[]>} An array of payouts.
   */
  public async getPayoutsBySellerProfile(sellerProfileId: string) {
    return prisma.payout.findMany({
      where: { sellerProfileId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Process a payout request.
   * @param {string} id - The payout request ID.
   * @param {'approve' | 'reject'} action - The action to take.
   * @returns {Promise<Payout>} The processed payout.
   */
  public async processPayoutRequest(id: string, action: 'approve' | 'reject') {
    return prisma.$transaction(async (tx) => {
      const payoutRequest = await tx.payoutRequest.findUnique({
        where: { id },
        include: { sellerProfile: true },
      })

      if (!payoutRequest) {
        throw new Error('Payout request not found')
      }

      if (payoutRequest.status !== 'PENDING') {
        throw new Error('Payout request is not in a pending state')
      }

      if (action === 'approve') {
        const payout = await tx.payout.create({
          data: {
            sellerProfileId: payoutRequest.sellerProfileId,
            payoutRequestId: payoutRequest.id,
            totalAmount: payoutRequest.totalAmount,
            currency: 'USD', // Assuming USD, adjust as needed
            status: PayoutStatus.PROCESSING,
          },
        })

        await tx.sellerProfile.update({
          where: { id: payoutRequest.sellerProfileId },
          data: {
            lastPayoutDate: new Date(),
            balance: {
              decrement: payoutRequest.totalAmount,
            },
          },
        })

        await tx.payoutRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            processedAt: new Date(),
          },
        })

        return payout
      } else {
        await tx.payoutRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            processedAt: new Date(),
          },
        })

        return null
      }
    })
  }
}
