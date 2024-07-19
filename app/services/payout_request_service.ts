import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { PayoutRequestStatus, SellerVerificationStatus } from '@prisma/client'
import { DateTime } from 'luxon'

const MINIMUM_PAYOUT_AMOUNT = 50
const COOLDOWN_PERIOD_DAYS = 7

@inject()
export default class PayoutRequestService {
  public async createPayoutRequest(userId: string, data: { totalAmount: number }) {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId },
      include: { user: true },
    })
    if (!sellerProfile) {
      throw new Error('Seller profile not found')
    }

    if (sellerProfile.verificationStatus !== SellerVerificationStatus.APPROVED) {
      throw new Error('Seller is not verified')
    }

    const lastPayoutRequest = await prisma.payoutRequest.findFirst({
      where: { sellerProfileId: sellerProfile.id },
      orderBy: { createdAt: 'desc' },
    })

    const lastPayoutDate =
      lastPayoutRequest?.createdAt || sellerProfile.lastPayoutDate || new Date(0)
    const cooldownPeriod = DateTime.fromJSDate(lastPayoutDate).plus({ days: COOLDOWN_PERIOD_DAYS })

    if (DateTime.now() < cooldownPeriod) {
      throw new Error('Cooldown period has not elapsed since last payout request')
    }

    if (data.totalAmount < MINIMUM_PAYOUT_AMOUNT) {
      throw new Error(`Minimum payout amount is $${MINIMUM_PAYOUT_AMOUNT}`)
    }

    if (data.totalAmount > sellerProfile.balance) {
      throw new Error('Requested amount exceeds available balance')
    }

    return prisma.$transaction(async (tx) => {
      const payoutRequest = await tx.payoutRequest.create({
        data: {
          sellerProfileId: sellerProfile.id,
          totalAmount: data.totalAmount,
          lastPayoutDate,
          status: PayoutRequestStatus.PENDING,
        },
      })

      await tx.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: { lastPayoutDate: new Date() },
      })

      return payoutRequest
    })
  }

  public async getSellerBalance(userId: string) {
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

  public async getPayoutRequestById(id: string) {
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

  public async updatePayoutRequest(id: string, data: Partial<PayoutRequestStatus>) {
    return prisma.payoutRequest.update({
      where: { id },
      data: {
        status: data,
      },
    })
  }

  public async deletePayoutRequest(id: string) {
    return prisma.payoutRequest.delete({ where: { id } })
  }

  public async getPaginatedPayoutRequests(page: number, limit: number) {
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

  public async getAllPayoutRequests() {
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

  public async getPayoutRequestsByUser(userId: string) {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } })
    if (!sellerProfile) {
      throw new Error('Seller profile not found')
    }

    return prisma.payoutRequest.findMany({
      where: { sellerProfileId: sellerProfile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  public async processPayoutRequest(id: string, action: 'approve' | 'reject', adminId: string) {
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
            currency: 'myr',
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
            status: PayoutRequestStatus.PROCESSED,
            processedAt: new Date(),
          },
        })
      } else {
        await tx.payoutRequest.update({
          where: { id },
          data: {
            status: PayoutRequestStatus.REJECTED,
            processedAt: new Date(),
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
      })
    })
  }
}
