import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { z } from 'zod'
import PayoutRequestService from '#services/payout_request_service'
import UnAuthorizedException from '#exceptions/un_authorized_exception'
import { createPayoutRequestSchema, updatePayoutRequestSchema } from '#validators/payout_request'
import { PayoutRequestStatus } from '@prisma/client'

@inject()
export default class PayoutRequestController {
  constructor(protected payoutRequestService: PayoutRequestService) {}

  public async create({ request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      const data = createPayoutRequestSchema.parse(request.body())
      const payoutRequest = await this.payoutRequestService.createPayoutRequest(
        request.user.id,
        data
      )
      return response.status(201).json(payoutRequest)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.abort({ message: 'Validation error', errors: error.errors }, 400)
      }
      return response.abort({ message: error.message }, 400)
    }
  }

  public async getSellerBalance({ request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      const balance = await this.payoutRequestService.getSellerBalance(request.user.id)
      return response.status(200).json(balance)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  public async getById({ params, response }: HttpContext) {
    const { id } = params
    try {
      const payoutRequest = await this.payoutRequestService.getPayoutRequestById(id)
      return response.status(200).json(payoutRequest)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  public async update({ params, request, response }: HttpContext) {
    const { id } = params
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      const data = updatePayoutRequestSchema.parse(request.body()) as { status: PayoutRequestStatus }
      const payoutRequest = await this.payoutRequestService.updatePayoutRequest(id, data.status)
      return response.status(200).json(payoutRequest)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.abort({ message: 'Validation error', errors: error.errors }, 400)
      }
      return response.abort({ message: error.message }, 400)
    }
  }

  public async delete({ params, response }: HttpContext) {
    const { id } = params
    try {
      await this.payoutRequestService.deletePayoutRequest(id)
      return response.status(200).json({ message: 'PayoutRequest deleted successfully' })
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

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

  public async getAll({ response }: HttpContext) {
    try {
      const payoutRequests = await this.payoutRequestService.getAllPayoutRequests()
      return response.status(200).json(payoutRequests)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  public async getCurrentUserPayoutRequests({ request, response }: HttpContext) {
    if (!request.user) throw new UnAuthorizedException('User not found in request object')
    try {
      const payoutRequests = await this.payoutRequestService.getPayoutRequestsByUser(
        request.user.id
      )
      return response.status(200).json(payoutRequests)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }

  public async processPayoutRequest({ params, request, response }: HttpContext) {
    const { id } = params
    if (!request.user) throw new UnAuthorizedException('User not found in request object')

    try {
      const { action } = request.body()
      const payoutRequest = await this.payoutRequestService.processPayoutRequest(
        id,
        action,
        request.user.id
      )
      return response.status(200).json(payoutRequest)
    } catch (error) {
      return response.abort({ message: error.message }, 400)
    }
  }
}
