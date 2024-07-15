import { inject } from '@adonisjs/core'
import { SellerProfile, User, SellerVerificationStatus, PayoutRequest, PayoutRequestStatus } from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'
import { createSellerProfileSchema, updateSellerProfileSchema, createPayoutRequestSchema } from '#validators/seller'

@inject()
export default class SellerService {
  /**
   * Apply for a seller account
   * @param userId - The ID of the user applying to be a seller
   * @param profileData - The seller profile data
   */
  public async applyForSellerAccount(userId: string, profileData: any): Promise<SellerProfile> {
    const validatedData = createSellerProfileSchema.parse(profileData)

    return await prisma.sellerProfile.create({
      data: {
        ...validatedData,
        userId,
        verificationStatus: SellerVerificationStatus.PENDING
      }
    })
  }

  /**
   * Get a seller's profile
   * @param userId - The ID of the user or seller
   */
  public async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    return await prisma.sellerProfile.findUnique({
      where: { userId }
    })
  }

  /**
   * Update a seller's profile
   * @param userId - The ID of the user or seller
   * @param profileData - The updated profile data
   */
  public async updateSellerProfile(userId: string, profileData: any): Promise<SellerProfile> {
    const validatedData = updateSellerProfileSchema.parse(profileData)

    return await prisma.sellerProfile.update({
      where: { userId },
      data: validatedData
    })
  }

  /**
   * Get all seller applications
   * @param status - Optional filter for verification status
   */
  public async getSellerApplications(status?: SellerVerificationStatus): Promise<SellerProfile[]> {
    return await prisma.sellerProfile.findMany({
      where: status ? { verificationStatus: status } : undefined,
      include: { user: true }
    })
  }

  /**
   * Update seller application status
   * @param sellerId - The ID of the seller profile
   * @param status - The new verification status
   */
  public async updateSellerApplicationStatus(sellerId: string, status: SellerVerificationStatus): Promise<SellerProfile> {
    return await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        verificationStatus: status,
        verificationDate: status === SellerVerificationStatus.APPROVED ? new Date() : null
      }
    })
  }

  /**
   * Get seller's balance
   * @param userId - The ID of the user or seller
   */
  public async getSellerBalance(userId: string): Promise<number> {
    const profile = await this.getSellerProfile(userId)
    return profile?.balance ?? 0
  }

  /**
   * Request a payout
   * @param userId - The ID of the user or seller
   * @param amount - The amount to request for payout
   */
  public async requestPayout(userId: string, amount: number): Promise<PayoutRequest> {
    const validatedData = createPayoutRequestSchema.parse({ amount })

    const profile = await this.getSellerProfile(userId)
    if (!profile) throw new Error('Seller profile not found')
    if (profile.balance < amount) throw new Error('Insufficient balance')

    return await prisma.payoutRequest.create({
      data: {
        sellerProfileId: profile.id,
        totalAmount: validatedData.amount,
        status: PayoutRequestStatus.PENDING
      }
    })
  }

  /**
   * Get payout history for a seller
   * @param userId - The ID of the user or seller
   */
  public async getPayoutHistory(userId: string): Promise<PayoutRequest[]> {
    const profile = await this.getSellerProfile(userId)
    if (!profile) throw new Error('Seller profile not found')

    return await prisma.payoutRequest.findMany({
      where: { sellerProfileId: profile.id },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Upload or update identity document
   * @param userId - The ID of the user or seller
   * @param documentUrl - The URL of the uploaded document
   */
  public async uploadIdentityDocument(userId: string, documentUrl: string): Promise<SellerProfile> {
    return await prisma.sellerProfile.update({
      where: { userId },
      data: {
        identityDoc: documentUrl,
        verificationStatus: SellerVerificationStatus.PENDING
      }
    })
  }

  /**
   * Verify seller's identity document
   * @param sellerId - The ID of the seller profile
   * @param isVerified - Whether the document is verified
   */
  public async verifySellerDocument(sellerId: string, isVerified: boolean): Promise<SellerProfile> {
    return await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        verificationStatus: isVerified ? SellerVerificationStatus.APPROVED : SellerVerificationStatus.REJECTED,
        verificationDate: isVerified ? new Date() : null
      }
    })
  }

  /**
   * Get all payout requests
   * @param status - Optional filter for payout request status
   */
  public async getPayoutRequests(status?: PayoutRequestStatus): Promise<PayoutRequest[]> {
    return await prisma.payoutRequest.findMany({
      where: status ? { status } : undefined,
      include: { sellerProfile: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Update payout request status
   * @param requestId - The ID of the payout request
   * @param status - The new status of the payout request
   */
  public async updatePayoutRequestStatus(requestId: string, status: PayoutRequestStatus): Promise<PayoutRequest> {
    return await prisma.payoutRequest.update({
      where: { id: requestId },
      data: {
        status,
        processedAt: status === PayoutRequestStatus.PROCESSED ? new Date() : null
      }
    })
  }
}
