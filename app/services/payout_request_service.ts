import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { PayoutRequest, PayoutRequestStatus, SellerProfile, SellerVerificationStatus, Payout, Prisma, BankAccount, Order } from '@prisma/client'
import { DateTime } from 'luxon'
import { z } from 'zod'

const MINIMUM_PAYOUT_AMOUNT = 50
const COOLDOWN_PERIOD_DAYS = 7

const createPayoutRequestSchema = z.object({
  totalAmount: z.number().positive(),
})

type CreatePayoutRequestData = z.infer<typeof createPayoutRequestSchema>

@inject()
export default class PayoutRequestService {
  /**
   * Create a new payout request.
   * @param {string} userId - The user ID of the seller.
   * @param {CreatePayoutRequestData} data - The payout request data.
   * @returns {Promise<PayoutRequest>} The created payout request.
   * @throws {Error} If the seller profile is not found, not verified, or other validation errors.
   */
  public async createPayoutRequest(userId: string, data: CreatePayoutRequestData): Promise<PayoutRequest> {
    const validatedData = createPayoutRequestSchema.parse(data)

    return prisma.$transaction(async (tx) => {
      const sellerProfile = await tx.sellerProfile.findUnique({
        where: { userId },
        include: { user: true },
      })
      if (!sellerProfile) {
        throw new Error('Seller profile not found')
      }

      if (sellerProfile.verificationStatus !== SellerVerificationStatus.APPROVED) {
        throw new Error('Seller is not verified')
      }

      const lastPayoutDate = sellerProfile.lastPayoutDate || new Date(0)
      const cooldownPeriod = DateTime.fromJSDate(lastPayoutDate).plus({ days: COOLDOWN_PERIOD_DAYS }).startOf('day')
      const now = DateTime.utc().startOf('day')

      if (now < cooldownPeriod) {
        throw new Error('Cooldown period has not elapsed since last payout request')
      }

      if (validatedData.totalAmount < MINIMUM_PAYOUT_AMOUNT) {
        throw new Error(`Minimum payout amount is $${MINIMUM_PAYOUT_AMOUNT}`)
      }

      if (validatedData.totalAmount > sellerProfile.balance) {
        throw new Error('Requested amount exceeds available balance')
      }

      const payoutRequest = await tx.payoutRequest.create({
        data: {
          sellerProfileId: sellerProfile.id,
          totalAmount: validatedData.totalAmount,
          status: PayoutRequestStatus.PENDING,
        },
      })

      await tx.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: {
          lastPayoutDate: now.toJSDate(),
          balance: {
            decrement: validatedData.totalAmount,
          },
        },
      })

      return payoutRequest
    })
  }

  /**
   * Get the balance and last payout request date for a seller.
   * @param {string} userId - The user ID of the seller.
   * @returns {Promise<{ balance: number; lastPayoutRequestDate: Date | null }>} The seller's balance and last payout request date.
   * @throws {Error} If the seller profile is not found.
   */
  public async getSellerBalance(userId: string): Promise<{ balance: number; lastPayoutRequestDate: Date | null }> {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId },
      select: { balance: true, lastPayoutDate: true },
    })

    if (!sellerProfile) {
      throw new Error('Seller profile not found')
    }

    return {
      balance: sellerProfile.balance,
      lastPayoutRequestDate: sellerProfile.lastPayoutDate,
    }
  }

  /**
   * Get a payout request by its ID.
   * @param {string} id - The payout request ID.
   * @returns {Promise<PayoutRequest & { sellerProfile: SellerProfile & { bankAccount: BankAccount | null }; orders: Order[] }>} The payout request with related data.
   * @throws {Error} If the payout request is not found.
   */
  public async getPayoutRequestById(id: string): Promise<PayoutRequest & { sellerProfile: SellerProfile & { bankAccount: BankAccount | null }; orders: Order[] }> {
    const payoutRequest = await prisma.payoutRequest.findUnique({
      where: { id },
      include: {
        sellerProfile: {
          include: { bankAccount: true },
        },
        orders: true,
      },
    })
    if (!payoutRequest) {
      throw new Error('PayoutRequest not found')
    }
    return payoutRequest
  }

  /**
   * Update a payout request's status.
   * @param {string} id - The payout request ID.
   * @param {Partial<PayoutRequestStatus>} data - The updated status data.
   * @returns {Promise<PayoutRequest>} The updated payout request.
   */
  public async updatePayoutRequest(id: string, data: Partial<PayoutRequestStatus>): Promise<PayoutRequest> {
    return prisma.payoutRequest.update({
      where: { id },
      data: {
        status: data,
      },
    })
  }

  /**
   * Delete a payout request.
   * @param {string} id - The payout request ID.
   * @returns {Promise<PayoutRequest>} The deleted payout request.
   */
  public async deletePayoutRequest(id: string): Promise<PayoutRequest> {
    return prisma.payoutRequest.delete({ where: { id } })
  }

  /**
   * Get paginated payout requests.
   * @param {number} page - The page number.
   * @param {number} limit - The number of items per page.
   * @returns {Promise<{ data: PayoutRequest[]; meta: { total: number; page: number; limit: number } }>} Paginated payout requests.
   */
  public async getPaginatedPayoutRequests(page: number, limit: number): Promise<{ data: PayoutRequest[]; meta: { total: number; page: number; limit: number } }> {
    const totalCount = await prisma.payoutRequest.count()
    const payoutRequests = await prisma.payoutRequest.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sellerProfile: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      data: payoutRequests,
      meta: {
        total: totalCount,
        page,
        limit,
      },
    }
  }

  /**
   * Get all payout requests for approved sellers.
   * @returns {Promise<PayoutRequest[]>} All payout requests for approved sellers.
   */
  public async getAllPayoutRequests(): Promise<PayoutRequest[]> {
    return await prisma.payoutRequest.findMany({
      where: {
        sellerProfile: {
          verificationStatus: SellerVerificationStatus.APPROVED,
        },
      },
      include: {
        sellerProfile: {
          include: {
            user: {
              select: { email: true, role: true, bannedUntil: true, deletedAt: true },
            },
            bankAccount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get payout requests for a specific user.
   * @param {string} userId - The user ID.
   * @returns {Promise<PayoutRequest[]>} Payout requests for the user.
   * @throws {Error} If the seller profile is not found.
   */
  public async getPayoutRequestsByUser(userId: string): Promise<PayoutRequest[]> {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } })
    if (!sellerProfile) {
      throw new Error('Seller profile not found')
    }

    return prisma.payoutRequest.findMany({
      where: { sellerProfileId: sellerProfile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Process a payout request.
   * @param {string} id - The payout request ID.
   * @param {'approve' | 'reject'} action - The action to take.
   * @param {string} adminId - The ID of the admin processing the request.
   * @returns {Promise<PayoutRequest>} The processed payout request.
   * @throws {Error} If the payout request is not found or not in a pending state.
   */
  public async processPayoutRequest(id: string, action: 'approve' | 'reject', adminId: string): Promise<PayoutRequest> {
    return prisma.$transaction(async (tx) => {
      const payoutRequest = await tx.payoutRequest.findUnique({
        where: { id },
        include: { sellerProfile: true },
      })

      if (!payoutRequest) {
        throw new Error('PayoutRequest not found')
      }

      if (payoutRequest.status !== PayoutRequestStatus.PENDING) {
        throw new Error('PayoutRequest is not in a pending state')
      }

      if (action === 'approve') {
        await tx.payout.create({
          data: {
            sellerProfileId: payoutRequest.sellerProfileId,
            payoutRequestId: payoutRequest.id,
            totalAmount: payoutRequest.totalAmount,
            currency: 'MYR',
          },
        })

        await tx.payoutRequest.update({
          where: { id },
          data: {
            status: PayoutRequestStatus.PROCESSED,
            processedAt: DateTime.utc().toJSDate(),
          },
        })
      } else {
        await tx.payoutRequest.update({
          where: { id },
          data: {
            status: PayoutRequestStatus.REJECTED,
            processedAt: DateTime.utc().toJSDate(),
          },
        })

        // Refund the amount back to the seller's balance
        await tx.sellerProfile.update({
          where: { id: payoutRequest.sellerProfileId },
          data: {
            balance: {
              increment: payoutRequest.totalAmount,
            },
          },
        })
      }

      return tx.payoutRequest.findUnique({
        where: { id },
        include: {
          sellerProfile: {
            include: { bankAccount: true },
          },
          orders: true,
        },
      }) as Promise<PayoutRequest & { sellerProfile: SellerProfile & { bankAccount: BankAccount | null }; orders: Order[] }>
    })
  }
}
