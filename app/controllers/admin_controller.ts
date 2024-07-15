import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { CommentService } from '#services/comment_service'
import SellerService from '#services/seller_service'
import { SellerVerificationStatus, PayoutRequestStatus } from '@prisma/client'
import { ReviewService } from '#services/review_service'

/**
 * Controller class for handling Admin operations on Seller Profiles.
 */
@inject()
export default class AdminController {
  constructor(
    protected commentService: CommentService,
    protected sellerService: SellerService,
    protected reviewService: ReviewService
  ) {}
  /**
   * Retrieve a Seller Profile by user ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the User/Seller.
   */
  public async getSellerProfile({ params, response }: HttpContext) {
    const { id } = params

    try {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: id },
        include: { bankAccount: true, user: true },
      })

      if (!sellerProfile) {
        return response.status(404).json({ message: 'Seller profile not found' })
      }

      return response.status(200).json(sellerProfile)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * Update a Seller Profile.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the User/Seller.
   * @bodyParam data - The data to update the Seller Profile.
   */
  public async updateSellerProfile({ params, request, response }: HttpContext) {
    const { email } = params
    const data = request.only([
      'businessName',
      'businessAddress',
      'businessPhone',
      'businessEmail',
      'accountHolderName',
      'accountNumber',
      'bankName',
      'swiftCode',
      'iban',
      'routingNumber',
      'verificationStatus',
    ])

    if (data.verificationStatus) {
      if (!Object.values(SellerVerificationStatus).includes(data.verificationStatus)) {
        return response.status(400).json({ message: 'Invalid status' })
      }
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return response.status(404).json({ message: 'User not found' })
    }

    try {
      await this.sellerService.updateSellerProfile(user.id, data)
      //const updatedProfile = await prisma.sellerProfile.update({
      //  where: { userId: user.id },
      //  data: {
      //    businessName: data.businessName,
      //    businessAddress: data.businessAddress,
      //    businessPhone: data.businessPhone,
      //    businessEmail: data.businessEmail,
      //    bankAccount: {
      //      upsert: {
      //        create: {
      //          accountHolderName: data.accountHolderName,
      //          accountNumber: data.accountNumber,
      //          bankName: data.bankName,
      //          swiftCode: data.swiftCode,
      //          iban: data.iban,
      //          routingNumber: data.routingNumber,
      //        },
      //        update: {
      //          accountHolderName: data.accountHolderName,
      //          accountNumber: data.accountNumber,
      //          bankName: data.bankName,
      //          swiftCode: data.swiftCode,
      //          iban: data.iban,
      //          routingNumber: data.routingNumber,
      //        },
      //      },
      //    },
      //  },
      //  include: { bankAccount: true },
      //})

      return response.status(200).json({ message: 'Seller profile updated successfully' })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * List all Seller Profiles with pagination.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async listSellerProfiles({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const skip = (page - 1) * limit

    try {
      const [sellerProfiles, total] = await prisma.$transaction([
        prisma.sellerProfile.findMany({
          skip,
          take: limit,
          include: { user: true, bankAccount: true },
        }),
        prisma.sellerProfile.count(),
      ])

      return response.status(200).json({
        data: sellerProfiles,
        meta: {
          total,
          page,
          limit,
        },
      })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * Verify a Seller Profile.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the User/Seller.
   * @bodyParam status - The verification status to set.
   */
  public async verifySellerProfile({ params, request, response }: HttpContext) {
    const { id } = params
    const { status } = request.only(['status'])

    try {
      const updatedProfile = await prisma.sellerProfile.update({
        where: { userId: id },
        data: {
          verificationStatus: status,
          verificationDate: new Date(),
        },
      })

      return response.status(200).json(updatedProfile)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * Ban a user.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the User/Seller.
   * @bodyParam banUntil - The date until which the user is banned.
   */
  public async banUser({ params, request, response }: HttpContext) {
    const { id } = params
    const { banUntil } = request.only(['banUntil'])

    try {
      const bannedUser = await prisma.user.update({
        where: { id },
        data: {
          bannedUntil: new Date(banUntil),
        },
      })

      return response.status(200).json(bannedUser)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async unbanUser({ params, response }: HttpContext) {
    const { id } = params
    try {
      const unbanUser = await prisma.user.update({
        where: { id },
        data: {
          bannedUntil: null,
        },
      })
      return response.status(200).json(unbanUser)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async deleteUser({ params, response }: HttpContext) {
    const { email } = params
    try {
      const deletedUser = await prisma.user.update({
        where: { email },
        data: {
          deletedAt: new Date(),
        },
      })
      return response.status(200).json(deletedUser)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async getAllFlaggedReviews({ response }: HttpContext) {
    try {
      const comments = await this.reviewService.getAllFlaggedReviews()
      return response.status(200).json(comments)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  public async getAllFlaggedComments({ response }: HttpContext) {
    try {
      const comments = await this.commentService.getAllFlaggedComments()
      return response.status(200).json(comments)
    } catch (error) {
      return response.status(error.status ?? 400).json({ message: error.message })
    }
  }

  /**
   * @getSellerApplications
   * @description Get all seller applications
   * @queryParam status - Optional filter for verification status
   * @responseBody 200 - { "applications": SellerProfile[] }
   */
  public async getSellerApplications({ request, response }: HttpContext) {
    const status = request.input('status') as SellerVerificationStatus | undefined
    try {
      const applications = await this.sellerService.getSellerApplications(status)
      return response.status(200).json({ applications })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @updateSellerApplicationStatus
   * @description Update the status of a seller application
   * @paramParam id - The ID of the seller profile
   * @requestBody {
   *   "status": "APPROVED" | "REJECTED"
   * }
   * @responseBody 200 - { "message": "Application status updated", "profile": SellerProfile }
   * @responseBody 400 - { "message": "Invalid status" }
   * @responseBody 404 - { "message": "Seller profile not found" }
   */
  public async updateSellerApplicationStatus({ params, request, response }: HttpContext) {
    const { id } = params
    const { verificationStatus } = request.body()

    if (!Object.values(SellerVerificationStatus).includes(verificationStatus)) {
      return response.status(400).json({ message: 'Invalid status' })
    }

    try {
      const profile = await this.sellerService.updateSellerApplicationStatus(id, verificationStatus)
      return response.status(200).json({ message: 'Application status updated', profile })
    } catch (error) {
      return response.status(404).json({ message: 'Seller profile not found' })
    }
  }

  /**
   * @getPayoutRequests
   * @description Get all payout requests
   * @queryParam status - Optional filter for payout request status
   * @responseBody 200 - { "requests": PayoutRequest[] }
   */
  public async getPayoutRequests({ request, response }: HttpContext) {
    const status = request.input('status') as PayoutRequestStatus | undefined
    try {
      const requests = await this.sellerService.getPayoutRequests(status)
      return response.status(200).json({ requests })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @updatePayoutRequestStatus
   * @description Update the status of a payout request
   * @paramParam id - The ID of the payout request
   * @requestBody {
   *   "status": "APPROVED" | "REJECTED" | "PROCESSED"
   * }
   * @responseBody 200 - { "message": "Payout request status updated", "request": PayoutRequest }
   * @responseBody 400 - { "message": "Invalid status" }
   * @responseBody 404 - { "message": "Payout request not found" }
   */
  public async updatePayoutRequestStatus({ params, request, response }: HttpContext) {
    const { id } = params
    const { status } = request.body()

    if (!Object.values(PayoutRequestStatus).includes(status)) {
      return response.status(400).json({ message: 'Invalid status' })
    }

    try {
      const payoutRequest = await this.sellerService.updatePayoutRequestStatus(id, status)
      return response
        .status(200)
        .json({ message: 'Payout request status updated', request: payoutRequest })
    } catch (error) {
      return response.status(404).json({ message: 'Payout request not found' })
    }
  }

  /**
   * @verifySellerDocument
   * @description Verify a seller's identity document
   * @paramParam id - The ID of the seller profile
   * @requestBody {
   *   "isVerified": boolean
   * }
   * @responseBody 200 - { "message": "Document verification status updated", "profile": SellerProfile }
   * @responseBody 404 - { "message": "Seller profile not found" }
   */
  public async verifySellerDocument({ params, request, response }: HttpContext) {
    const { id } = params
    const { isVerified } = request.body()

    try {
      const profile = await this.sellerService.verifySellerDocument(id, isVerified)
      return response.status(200).json({ message: 'Document verification status updated', profile })
    } catch (error) {
      return response.status(404).json({ message: 'Seller profile not found' })
    }
  }
}
