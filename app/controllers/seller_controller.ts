import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import SellerService from '#services/seller_service'
import { createSellerProfileSchema, updateSellerProfileSchema, createPayoutRequestSchema } from '#validators/seller'

@inject()
export default class SellerController {
  constructor(protected sellerService: SellerService) {}

/**
 * @applyForSellerAccount
 * @description Apply for a seller account including bank account details
 * @requestBody {
 *   "businessName": "string",
 *   "businessAddress": "string",
 *   "businessPhone": "string",
 *   "businessEmail": "string",
 *   "bankAccount": {
 *     "accountHolderName": "string",
 *     "accountNumber": "string",
 *     "bankName": "string",
 *     "swiftCode": "string",
 *     "iban": "string",
 *     "routingNumber": "string"
 *   }
 * }
 * @responseBody 201 - { "message": "Application submitted successfully", "profile": SellerProfile }
 * @responseBody 400 - { "message": "Invalid input data" }
 * @responseBody 409 - { "message": "Seller profile already exists" }
 */
public async applyForSellerAccount({ request, response }: HttpContext) {
  try {
    const userId = request.user?.id
    if (!userId) {
      return response.unauthorized('User not authenticated')
    }

    const data = createSellerProfileSchema.parse(request.body())
    
    const profile = await this.sellerService.applyForSellerAccount(userId, {
      businessName: data.businessName,
      businessAddress: data.businessAddress,
      businessPhone: data.businessPhone,
      businessEmail: data.businessEmail,
      bankAccount: {
        accountHolderName: data.bankAccount.accountHolderName,
        accountNumber: data.bankAccount.accountNumber,
        bankName: data.bankAccount.bankName,
        swiftCode: data.bankAccount.swiftCode,
        iban: data.bankAccount.iban,
        routingNumber: data.bankAccount.routingNumber
      }
    })

    return response.created({ message: 'Application submitted successfully', profile })
  } catch (error) {
    if (error.code === 'P2002') {
      return response.conflict({ message: 'Seller profile already exists' })
    }
    return response.badRequest({ message: error.message })
  }
}

  /**
   * @updateProfile
   * @description Update the current seller's profile
   * @requestBody {
   *   "businessName": "string",
   *   "businessAddress": "string",
   *   "businessPhone": "string",
   *   "businessEmail": "string"
   * }
   * @responseBody 200 - { "message": "Profile updated successfully", "profile": SellerProfile }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 404 - { "message": "Seller profile not found" }
   */
  public async updateProfile({ request, response }: HttpContext) {
    try {
      const userId = request.user?.id
      if (!userId) {
        return response.unauthorized('User not authenticated')
      }

      const data = updateSellerProfileSchema.parse(request.body())
      const profile = await this.sellerService.updateSellerProfile(userId, data)
      return response.ok({ message: 'Profile updated successfully', profile })
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * @getBalance
   * @description Get the current seller's balance
   * @responseBody 200 - { "balance": number }
   * @responseBody 404 - { "message": "Seller profile not found" }
   */
  public async getBalance({ request, response }: HttpContext) {
    const userId = request.user?.id
    if (!userId) {
      return response.unauthorized('User not authenticated')
    }

    const balance = await this.sellerService.getSellerBalance(userId)
    return response.ok({ balance })
  }

  /**
   * @requestPayout
   * @description Request a payout for the current seller
   * @requestBody {
   *   "amount": number
   * }
   * @responseBody 201 - { "message": "Payout request submitted", "request": PayoutRequest }
   * @responseBody 400 - { "message": "Invalid input data" or "Insufficient balance" }
   * @responseBody 404 - { "message": "Seller profile not found" }
   */
  public async requestPayout({ request, response }: HttpContext) {
    try {
      const userId = request.user?.id
      if (!userId) {
        return response.unauthorized('User not authenticated')
      }

      const { amount } = createPayoutRequestSchema.parse(request.body())
      const payoutRequest = await this.sellerService.requestPayout(userId, amount)
      return response.created({ message: 'Payout request submitted', request: payoutRequest })
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }

  /**
   * @getPayoutHistory
   * @description Get the payout history for the current seller
   * @responseBody 200 - { "payouts": PayoutRequest[] }
   * @responseBody 404 - { "message": "Seller profile not found" }
   */
  public async getPayoutHistory({ request, response }: HttpContext) {
    const userId = request.user?.id
    if (!userId) {
      return response.unauthorized('User not authenticated')
    }

    const payouts = await this.sellerService.getPayoutHistory(userId)
    return response.ok({ payouts })
  }

  /**
   * @uploadIdentityDocument
   * @description Upload or update the identity document for the current seller
   * @requestBody {
   *   "documentUrl": "string"
   * }
   * @responseBody 200 - { "message": "Document uploaded successfully", "profile": SellerProfile }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 404 - { "message": "Seller profile not found" }
   */
  public async uploadIdentityDocument({ request, response }: HttpContext) {
    try {
      const userId = request.user?.id
      if (!userId) {
        return response.unauthorized('User not authenticated')
      }

      const { documentUrl } = request.body()
      if (!documentUrl) {
        return response.badRequest({ message: 'Document URL is required' })
      }

      const profile = await this.sellerService.uploadIdentityDocument(userId, documentUrl)
      return response.ok({ message: 'Document uploaded successfully', profile })
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }
}
