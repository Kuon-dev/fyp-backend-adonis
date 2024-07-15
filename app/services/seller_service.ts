import { inject } from '@adonisjs/core'
import {
  SellerProfile,
  //User,
  SellerVerificationStatus,
  PayoutRequest,
  PayoutRequestStatus,
} from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'
import {
  createSellerProfileSchema,
  updateSellerProfileSchema,
  createPayoutRequestSchema,
  UpdateSellerProfileDto,
} from '#validators/seller'
import { S3Facade } from '#integrations/s3/s3_facade'

interface SalesDataPoint {
  date: string
  revenue: number
  salesCount: number
}

interface RecentReview {
  id: string
  content: string
  rating: number
  createdAt: Date
  repoName: string
  userName: string
}

interface DashboardData {
  salesData: SalesDataPoint[]
  recentReviews: RecentReview[]
}
import logger from '@adonisjs/core/services/logger'

@inject()
export default class SellerService {
  constructor (protected s3Facade: S3Facade) {}
  /**
   * Apply for a seller account
   * @param userId - The ID of the user applying to be a seller
   * @param profileData - The seller profile and bank account data
   */
  public async applyForSellerAccount(userId: string, profileData: any): Promise<SellerProfile> {
    const validatedData = createSellerProfileSchema.parse(profileData)

    return await prisma.$transaction(async (trx) => {
      // Update the existing seller profile
      const updatedProfile = await trx.sellerProfile.update({
        where: { userId },
        data: {
          businessName: validatedData.businessName,
          businessAddress: validatedData.businessAddress,
          businessPhone: validatedData.businessPhone,
          businessEmail: validatedData.businessEmail,
          verificationStatus: SellerVerificationStatus.PENDING,
        },
      })

      // Create or update the bank account
      await trx.bankAccount.upsert({
        where: { sellerProfileId: updatedProfile.id },
        create: {
          sellerProfileId: updatedProfile.id,
          accountHolderName: validatedData.accountHolderName,
          accountNumber: validatedData.accountNumber,
          bankName: validatedData.bankName,
          swiftCode: validatedData.swiftCode,
          iban: validatedData.iban,
          routingNumber: validatedData.routingNumber,
        },
        update: {
          accountHolderName: validatedData.accountHolderName,
          accountNumber: validatedData.accountNumber,
          bankName: validatedData.bankName,
          swiftCode: validatedData.swiftCode,
          iban: validatedData.iban,
          routingNumber: validatedData.routingNumber,
        },
      })

      return updatedProfile
    })
  }

  /**
   * Get a seller's profile
   * @param userId - The ID of the user or seller
   */
  public async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    return await prisma.sellerProfile.findUnique({
      where: { userId },
    })
  }

/**
 * Update a seller's profile including bank account details and verification status
 * @param userId - The ID of the user or seller
 * @param profileData - The updated profile data
 */
public async updateSellerProfile(userId: string, profileData: UpdateSellerProfileDto): Promise<SellerProfile> {
  const validatedData = updateSellerProfileSchema.parse(profileData);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }
  try {
    const updatedProfile = await prisma.sellerProfile.update({
      where: { userId: user.id },
      data: {
        ...(validatedData.businessName && { businessName: validatedData.businessName }),
        ...(validatedData.businessAddress && { businessAddress: validatedData.businessAddress }),
        ...(validatedData.businessPhone && { businessPhone: validatedData.businessPhone }),
        ...(validatedData.businessEmail && { businessEmail: validatedData.businessEmail }),
        ...(validatedData.verificationStatus && { 
          verificationStatus: validatedData.verificationStatus,
          ...(validatedData.verificationStatus === 'APPROVED' && { verificationDate: new Date() })
        }),
        bankAccount: {
          upsert: {
            create: {
              accountHolderName: validatedData.accountHolderName || '',
              accountNumber: validatedData.accountNumber || '',
              bankName: validatedData.bankName || '',
              swiftCode: validatedData.swiftCode || '',
              iban: validatedData.iban,
              routingNumber: validatedData.routingNumber,
            },
            update: {
              ...(validatedData.accountHolderName && {
                accountHolderName: validatedData.accountHolderName,
              }),
              ...(validatedData.accountNumber && { accountNumber: validatedData.accountNumber }),
              ...(validatedData.bankName && { bankName: validatedData.bankName }),
              ...(validatedData.swiftCode && { swiftCode: validatedData.swiftCode }),
              ...(validatedData.iban && { iban: validatedData.iban }),
              ...(validatedData.routingNumber && { routingNumber: validatedData.routingNumber }),
            },
          },
        },
      },
      include: { bankAccount: true },
    });
    return updatedProfile;
  } catch (error) {
    throw new Error(`Failed to update seller profile: ${error.message}`);
  }
}

  /**
   * Get all seller applications
   * @param status - Optional filter for verification status
   */
  public async getSellerApplications(status?: SellerVerificationStatus): Promise<SellerProfile[]> {
    return await prisma.sellerProfile.findMany({
      where: status ? { verificationStatus: status } : undefined,
      include: { user: true },
    })
  }

  /**
   * Update seller application status
   * @param sellerId - The ID of the seller profile
   * @param status - The new verification status
   */
  public async updateSellerApplicationStatus(
    sellerId: string,
    status: SellerVerificationStatus
  ): Promise<SellerProfile> {
    return await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        verificationStatus: status,
        verificationDate: status === SellerVerificationStatus.APPROVED ? new Date() : null,
      },
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
        status: PayoutRequestStatus.PENDING,
      },
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
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Upload or update identity document
   * @param userId - The ID of the user or seller
   * @param documentUrl - The URL of the uploaded document
   */
  //public async uploadIdentityDocument(userId: string, documentUrl: string): Promise<SellerProfile> {
  //  return await prisma.sellerProfile.update({
  //    where: { userId },
  //    data: {
  //      identityDoc: documentUrl,
  //      verificationStatus: SellerVerificationStatus.PENDING,
  //    },
  //  })
  //}

  /**
   * Verify seller's identity document
   * @param sellerId - The ID of the seller profile
   * @param isVerified - Whether the document is verified
   */
  public async verifySellerDocument(sellerId: string, isVerified: boolean): Promise<SellerProfile> {
    return await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        verificationStatus: isVerified
          ? SellerVerificationStatus.APPROVED
          : SellerVerificationStatus.REJECTED,
        verificationDate: isVerified ? new Date() : null,
      },
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
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update payout request status
   * @param requestId - The ID of the payout request
   * @param status - The new status of the payout request
   */
  public async updatePayoutRequestStatus(
    requestId: string,
    status: PayoutRequestStatus
  ): Promise<PayoutRequest> {
    return await prisma.payoutRequest.update({
      where: { id: requestId },
      data: {
        status,
        processedAt: status === PayoutRequestStatus.PROCESSED ? new Date() : null,
      },
    })
  }

  /**
   * Upload identity document for a seller
   * @param userId - The ID of the user or seller
   * @param file - The PDF file to upload
   */
  public async uploadIdentityDocument(userId: string, file: Buffer): Promise<SellerProfile> {
    const profile = await this.getSellerProfile(userId)
    if (!profile) throw new Error('Seller profile not found')

    try {
      const { media } = await this.s3Facade.uploadFile(file, 'application/pdf', prisma, 'identity-documents')

      return await prisma.sellerProfile.update({
        where: { userId },
        data: {
          identityDoc: media.url,
          verificationStatus: SellerVerificationStatus.PENDING,
        },
      })
    } catch (error) {
      throw new Error(`Failed to upload identity document: ${error.message}`)
    }
  }

  /**
   * Get the signed URL for a seller's identity document
   * @param userId - The ID of the user or seller
   */
  public async getIdentityDocumentUrl(userId: string): Promise<string | null> {
    const profile = await this.getSellerProfile(userId)
    if (!profile || !profile.identityDoc) return null

    const fileKey = profile.identityDoc.split('/').pop()
    if (!fileKey) return null

    try {
      return await this.s3Facade.getSignedUrl(fileKey)
    } catch (error) {
      throw new Error(`Failed to get signed URL: ${error.message}`)
    }
  }

  /**
   * Get dashboard data including sales analytics and recent reviews
   * @param userId - The ID of the user or seller
   * @param days - Number of days to fetch sales data for (default: 30)
   */
  public async getDashboardData(userId: string, days: number = 30): Promise<DashboardData> {
    const endDate = DateTime.now().endOf('day')
    const startDate = endDate.minus({ days: days - 1 }).startOf('day')

    // Fetch sales data
    const salesData = await prisma.salesAggregate.findMany({
      where: {
        sellerId: userId,
        date: {
          gte: startDate.toJSDate(),
          lte: endDate.toJSDate(),
        },
      },
      orderBy: { date: 'asc' },
    })

    // Fill in missing dates with zero values
    const filledSalesData: SalesDataPoint[] = []
    let currentDate = startDate
    while (currentDate <= endDate) {
      const existingData = salesData.find(
        (d) => DateTime.fromJSDate(d.date).hasSame(currentDate, 'day')
      )
      filledSalesData.push({
        date: currentDate.toFormat('yyyy-MM-dd'),
        revenue: existingData?.revenue ?? 0,
        salesCount: existingData?.salesCount ?? 0,
      })
      currentDate = currentDate.plus({ days: 1 })
    }

    // Fetch recent reviews
    const recentReviews = await prisma.review.findMany({
      where: {
        repo: {
          userId: userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        repo: {
          select: { name: true },
        },
        user: {
          select: { email: true },
        },
      },
    })

    const formattedReviews: RecentReview[] = recentReviews.map((review) => ({
      id: review.id,
      content: review.content,
      rating: review.rating,
      createdAt: review.createdAt,
      repoName: review.repo.name,
      userName: review.user.email, // Using email as userName for privacy
    }))

    return {
      salesData: filledSalesData,
      recentReviews: formattedReviews,
    }
  }
}
