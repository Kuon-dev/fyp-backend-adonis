import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { PayoutRequestStatus } from '@prisma/client'
import { DateTime } from 'luxon'

@inject()
export default class PayoutRequestService {
  public async createPayoutRequest(userId: string, data: { totalAmount: number }) {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } })
    if (!sellerProfile) {
      throw new Error('Seller profile not found')
    }

    const lastPayoutRequest = await prisma.payoutRequest.findFirst({
      where: { sellerProfileId: sellerProfile.id },
      orderBy: { createdAt: 'desc' },
    })

    const lastPayoutDate = lastPayoutRequest?.createdAt || sellerProfile.lastPayoutDate || new Date(0)

    const orders = await prisma.order.findMany({
      where: {
        codeRepo: { userId },
        createdAt: { gt: lastPayoutDate },
        status: 'SUCCEEDED',
      },
    })

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)

    return prisma.$transaction(async (tx) => {
      const payoutRequest = await tx.payoutRequest.create({
        data: {
          sellerProfileId: sellerProfile.id,
          totalAmount,
          lastPayoutDate,
          status: PayoutRequestStatus.PENDING,
        },
      })

      await tx.order.updateMany({
        where: { id: { in: orders.map(order => order.id) } },
        data: { payoutRequestId: payoutRequest.id },
      })

      return payoutRequest
    })
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
      data,
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
            amount: payoutRequest.totalAmount,
            currency: 'USD', // Assuming USD, adjust as needed
            status: 'PENDING',
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
            status: PayoutRequestStatus.APPROVED,
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
