import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { Payout, PayoutRequest, Prisma } from '@prisma/client'
import { z } from 'zod'

const createPayoutSchema = z.object({
  payoutRequestId: z.string().cuid(),
  sellerProfileId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.string().default('MYR'),
})

type CreatePayoutData = z.infer<typeof createPayoutSchema>

@inject()
export default class PayoutService {
  /**
   * Create a new payout.
   * @param {CreatePayoutData} data - The payout data.
   * @returns {Promise<Payout>} The created payout.
   */
  public async createPayout(data: CreatePayoutData): Promise<Payout> {
    const validatedData = createPayoutSchema.parse(data)
    return prisma.payout.create({
      data: {
        payoutRequestId: validatedData.payoutRequestId,
        sellerProfileId: validatedData.sellerProfileId,
        totalAmount: validatedData.amount,
        currency: validatedData.currency,
      },
    })
  }

  /**
   * Get a payout by its ID.
   * @param {string} id - The payout ID.
   * @returns {Promise<Payout>} The payout.
   * @throws {Error} If the payout is not found.
   */
  public async getPayoutById(id: string): Promise<Payout> {
    const payout = await prisma.payout.findUnique({ where: { id } })
    if (!payout) {
      throw new Error('Payout not found')
    }
    return payout
  }

  /**
   * Get all payouts for a specific seller profile.
   * @param {string} sellerProfileId - The seller profile ID.
   * @returns {Promise<Payout[]>} An array of payouts.
   */
  public async getPayoutsBySellerProfile(sellerProfileId: string): Promise<Payout[]> {
    return prisma.payout.findMany({
      where: { sellerProfileId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Process a payout request.
   * @param {string} id - The payout request ID.
   * @param {'approve' | 'reject'} action - The action to take.
   * @returns {Promise<Payout | null>} The processed payout or null if rejected.
   * @throws {Error} If the payout request is not found or not in a pending state.
   */
  public async processPayoutRequest(
    id: string,
    action: 'approve' | 'reject'
  ): Promise<Payout | null> {
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
            currency: 'MYR',
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
            status: 'PROCESSED',
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
