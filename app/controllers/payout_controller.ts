import { HttpContext } from '@adonisjs/core/http'
import { PayoutService } from '#services/payout_service'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { inject } from '@adonisjs/core'

@inject()
export default class PayoutsController {
  private payoutService: PayoutService

  constructor() {
    this.payoutService = new PayoutService()
  }

  /**
   * @createPayout
   * @description Create a payout for the authenticated seller
   * @requestBody {
   *   "startDate": "2023-01-01",
   *   "endDate": "2023-01-31"
   * }
   * @responseBody 200 - {
   *   "message": "Payout created successfully",
   *   "payout": {
   *     "id": "cuid",
   *     "amount": 1000,
   *     "currency": "USD",
   *     "status": "PROCESSING",
   *     "createdAt": "2023-02-01T00:00:00.000Z"
   *   }
   * }
   * @responseBody 400 - { "message": "Invalid input. Start date and end date are required." }
   * @responseBody 500 - { "message": "An error occurred while processing the payout." }
   */
  async createPayout({ request, response }: HttpContext) {
    const schema = z.object({
      startDate: z.string().transform((str) => DateTime.fromISO(str)),
      endDate: z.string().transform((str) => DateTime.fromISO(str)),
    })

    const result = schema.safeParse(request.body())

    if (!result.success) {
      return response.badRequest({ message: 'Invalid input', errors: result.error.issues })
    }

    const { startDate, endDate } = result.data
    const sellerId = request.user!.id

    try {
      const amount = await this.payoutService.calculatePayoutAmount(sellerId, startDate, endDate)
      const payout = await this.payoutService.createPayout(sellerId, amount, 'USD')

      return response.ok({
        message: 'Payout created successfully',
        payout: {
          id: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          createdAt: payout.createdAt,
        },
      })
    } catch (error) {
      return response.internalServerError({
        message: 'An error occurred while processing the payout',
        error: error.message,
      })
    }
  }

  /**
   * @getPayoutHistory
   * @description Get payout history for the authenticated seller
   * @queryParam page {number} The page number (default: 1)
   * @queryParam limit {number} The number of items per page (default: 10)
   * @responseBody 200 - {
   *   "payouts": [
   *     {
   *       "id": "cuid",
   *       "amount": 1000,
   *       "currency": "USD",
   *       "status": "COMPLETED",
   *       "createdAt": "2023-02-01T00:00:00.000Z"
   *     }
   *   ],
   *   "page": 1,
   *   "limit": 10
   * }
   * @responseBody 500 - { "message": "An error occurred while fetching payout history." }
   */
  async getPayoutHistory({ request, response }: HttpContext) {
    const schema = z.object({
      page: z.string().transform(Number).default('1'),
      limit: z.string().transform(Number).default('10'),
    })

    const result = schema.safeParse(request.qs())

    if (!result.success) {
      return response.badRequest({ message: 'Invalid input', errors: result.error.issues })
    }

    const { page, limit } = result.data
    const sellerId = request.user!.id

    try {
      const payouts = await this.payoutService.getPayoutHistory(sellerId, page, limit)

      return response.ok({
        payouts: payouts.map((payout) => ({
          id: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          createdAt: payout.createdAt,
        })),
        page,
        limit,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'An error occurred while fetching payout history',
        error: error.message,
      })
    }
  }
}
