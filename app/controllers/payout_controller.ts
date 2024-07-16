import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import PayoutService from '#services/payout_service'
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import { createPayoutSchema, updatePayoutSchema } from '#validators/payout'

@inject()
export default class PayoutController {
  constructor(protected payoutService: PayoutService) {}

  /**
   * @createPayout
   * @description Create a new payout for a seller.
   * @requestBody {
   *   "sellerProfileId": "seller123",
   *   "amount": 1000,
   *   "currency": "USD"
   *   "payoutRequestId": "payout123
   * }
   * @responseBody 201 - {
   *   "id": "payout123",
   *   "sellerProfileId": "seller123",
   *   "amount": 1000,
   *   "currency": "USD",
   *   "status": "PENDING"
   * }
   * @responseBody 400 - { "error": "Invalid input data" }
   * @responseBody 404 - { "error": "Seller profile not found" }
   * @responseBody 500 - { "error": "Error creating payout" }
   */
  public async create({ request, response }: HttpContext) {
    try {
      const data = createPayoutSchema.parse(request.body())
      const payout = await this.payoutService.createPayout(data)
      return response.status(201).json(payout)
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  /**
   * @getPayoutById
   * @description Retrieve a payout by its ID.
   * @paramParam id - The ID of the payout to retrieve.
   * @responseBody 200 - {
   *   "id": "payout123",
   *   "sellerProfileId": "seller123",
   *   "amount": 1000,
   *   "currency": "USD",
   *   "status": "PENDING"
   * }
   * @responseBody 404 - { "error": "Payout not found" }
   * @responseBody 500 - { "error": "Error retrieving payout" }
   */
  public async getById({ params, response }: HttpContext) {
    try {
      const payout = await this.payoutService.getPayoutById(params.id)
      return response.json(payout)
    } catch (error) {
      return response.status(404).json({ error: error.message })
    }
  }

  /**
   * @updatePayout
   * @description Update the status of a payout.
   * @paramParam id - The ID of the payout to update.
   * @requestBody {
   *   "status": "COMPLETED"
   * }
   * @responseBody 200 - {
   *   "id": "payout123",
   *   "sellerProfileId": "seller123",
   *   "amount": 1000,
   *   "currency": "USD",
   *   "status": "COMPLETED"
   * }
   * @responseBody 400 - { "error": "Invalid input data" }
   * @responseBody 404 - { "error": "Payout not found" }
   * @responseBody 500 - { "error": "Error updating payout" }
   */
  //public async update({ params, request, response }: HttpContext) {
  //  try {
  //    const data = updatePayoutSchema.parse(request.body())
  //    const payout = await this.payoutService.updatePayout(params.id, data)
  //    return response.json(payout)
  //  } catch (error) {
  //    return response.status(400).json({ error: error.message })
  //  }
  //}
  //
  /**
   * @getPayoutsBySellerProfile
   * @description Retrieve all payouts for a specific seller profile.
   * @paramParam sellerProfileId - The ID of the seller profile.
   * @responseBody 200 - [
   *   {
   *     "id": "payout123",
   *     "sellerProfileId": "seller123",
   *     "amount": 1000,
   *     "currency": "USD",
   *     "status": "PENDING"
   *   },
   *   {
   *     "id": "payout124",
   *     "sellerProfileId": "seller123",
   *     "amount": 2000,
   *     "currency": "USD",
   *     "status": "COMPLETED"
   *   }
   * ]
   * @responseBody 404 - { "error": "Seller profile not found" }
   * @responseBody 500 - { "error": "Error retrieving payouts" }
   */
  public async getBySellerProfile({ params, response }: HttpContext) {
    try {
      const payouts = await this.payoutService.getPayoutsBySellerProfile(params.sellerProfileId)
      return response.json(payouts)
    } catch (error) {
      return response.status(404).json({ error: error.message })
    }
  }

  /**
   * @processPayoutRequest
   * @description Process a payout request (for admins only).
   * @paramParam id - The ID of the payout request to process.
   * @requestBody {
   *   "action": "approve" | "reject"
   * }
   * @responseBody 200 - {
   *   "id": "payout123",
   *   "sellerProfileId": "seller123",
   *   "amount": 1000,
   *   "currency": "USD",
   *   "status": "PROCESSING"
   * }
   * @responseBody 400 - { "error": "Invalid action" }
   * @responseBody 404 - { "error": "Payout request not found" }
   * @responseBody 500 - { "error": "Error processing payout request" }
   */
  //public async processPayoutRequest({ params, request, response }: HttpContext) {
  //  if (!request.user || request.user.role !== 'ADMIN') {
  //    throw new UnAuthorizedException('Only admins can process payout requests')
  //  }
  //
  //  try {
  //    const { action } = request.body()
  //    const payout = await this.payoutService.processPayoutRequest(params.id, action)
  //    return response.json(payout)
  //  } catch (error) {
  //    return response.status(400).json({ error: error.message })
  //  }
  //}
}
