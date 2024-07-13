import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import { z } from 'zod'
import PayoutRequestService from '#services/payout_request_service'
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import { createPayoutRequestSchema, updatePayoutRequestSchema } from '#validators/payout_request'

/**
 * Controller class for handling PayoutRequest operations.
 */
@inject()
export default class PayoutRequestController {
  constructor(protected payoutRequestService: PayoutRequestService) {}

  /**
   * Create a new PayoutRequest.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async create({ request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      const data = createPayoutRequestSchema.parse(request.body())
      const payoutRequest = await this.payoutRequestService.createPayoutRequest(request.user.id, data)
      return response.status(201).json(payoutRequest)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.abort({ message: 'Validation error', errors: error.errors }, 400)
      }
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Retrieve a PayoutRequest by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async getById({ params, response }: HttpContext) {
    const { id } = params
    try {
      const payoutRequest = await this.payoutRequestService.getPayoutRequestById(id)
      return response.status(200).json(payoutRequest)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Update a PayoutRequest.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async update({ params, request, response }: HttpContext) {
    const { id } = params
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      const data = updatePayoutRequestSchema.parse(request.body())
      const payoutRequest = await this.payoutRequestService.updatePayoutRequest(id, data)
      return response.status(200).json(payoutRequest)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.abort({ message: 'Validation error', errors: error.errors }, 400)
      }
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Delete a PayoutRequest by ID.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async delete({ params, response }: HttpContext) {
    const { id } = params
    try {
      await this.payoutRequestService.deletePayoutRequest(id)
      return response.status(200).json({ message: 'PayoutRequest deleted successfully' })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Retrieve paginated PayoutRequests.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async getPaginated({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    try {
      const payoutRequests = await this.payoutRequestService.getPaginatedPayoutRequests(page, limit)
      return response.status(200).json(payoutRequests)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Retrieve PayoutRequests for the current user.
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async getCurrentUserPayoutRequests({ request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not found in request object')
    try {
      const payoutRequests = await this.payoutRequestService.getPayoutRequestsByUser(request.user.id)
      return response.status(200).json(payoutRequests)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  /**
   * Process a PayoutRequest (for admins).
   * @param {HttpContext} ctx - The HTTP context object.
   */
  public async processPayoutRequest({ params, request, response }: HttpContext) {
    const { id } = params
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      const { action } = request.body()
      const payoutRequest = await this.payoutRequestService.processPayoutRequest(id, action, request.user.id)
      return response.status(200).json(payoutRequest)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }
}
