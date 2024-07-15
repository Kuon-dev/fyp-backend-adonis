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
   *   "accountHolderName": "string",
   *   "accountNumber": "string",
   *   "bankName": "string",
   *   "swiftCode": "string",
   *   "iban": "string",
   *   "routingNumber": "string"
   * }
   * @responseBody 200 - { "message": "Application submitted successfully", "profile": SellerProfile }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 401 - { "message": "User not authenticated" }
   * @responseBody 500 - { "message": "An error occurred while processing the request" }
   */
  public async applyForSellerAccount({ request, response }: HttpContext) {
    const userId = request.user?.id
    if (!userId) {
      return response.unauthorized({ message: 'User not authenticated' })
    }

    try {
      const data = createSellerProfileSchema.parse(request.body())
      
      const profile = await this.sellerService.applyForSellerAccount(userId, data)

      return response.ok({ 
        message: 'Application submitted successfully', 
        profile 
      })
    } catch (error) {
      if (error.name === 'ZodError') {
        return response.badRequest({ 
          message: 'Invalid input data',
          errors: error.errors
        })
      }
      
      console.error('Error in applyForSellerAccount:', error)
      return response.internalServerError({ 
        message: 'An error occurred while processing the request' 
      })
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
