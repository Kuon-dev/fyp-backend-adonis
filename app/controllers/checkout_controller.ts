import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { z } from 'zod'
import CheckoutService from '#services/checkout_service'
import { prisma } from '#services/prisma_service'
import logger from '@adonisjs/core/services/logger'

const initCheckoutSchema = z.object({
  repoId: z.string(),
})

const processPaymentSchema = z.object({
  paymentIntentId: z.string(),
})

@inject()
export default class CheckoutController {
  constructor(protected checkoutService: CheckoutService) {}

  /**
   * @initCheckout
   * @description Initiate the checkout process for a repo
   * @requestBody {
   *   "repoId": "clxxxxxxxxxxxxxxxx"
   * }
   * @responseBody 200 - {
   *   "clientSecret": "pi_xxxxxxxxxxxxx_secret_xxxxxxxxxxxxxx"
   * }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 404 - { "message": "Repo not found" }
   * @responseBody 500 - { "message": "An error occurred while initiating checkout" }
   */
  public async initCheckout({ request, response }: HttpContext) {
    try {
      const user = request.user
      if (!user) {
        return response.unauthorized({ message: 'User not authenticated' })
      }
      const { repoId } = initCheckoutSchema.parse(request.body())

      const result = await this.checkoutService.initCheckout(repoId, user.id)
      return response.ok(result)
    } catch (error) {
      logger.error({ err: error }, 'Error in initCheckout')
      if (error instanceof z.ZodError) {
        return response.badRequest({ message: 'Invalid input data', errors: error.errors })
      }
      if (
        error instanceof Error &&
        error.message === 'Repo not found or seller profile not available'
      ) {
        return response.notFound({ message: error.message })
      }
      return response.abort({
        message: error.message || 'An error occurred while initiating checkout',
        status: 500,
      })
    }
  }

  /**
   * @processPayment
   * @description Process the payment for a checkout
   * @requestBody {
   *   "paymentIntentId": "pi_xxxxxxxxxxxxx"
   * }
   * @responseBody 200 - {
   *   "success": true,
   *   "orderId": "clxxxxxxxxxxxxxxxx"
   * }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 404 - { "message": "Payment intent not found" }
   * @responseBody 409 - { "message": "Payment has already been processed" }
   * @responseBody 500 - { "message": "An error occurred while processing payment" }
   */
  public async processPayment({ request, response }: HttpContext) {
    const user = request.user
    if (!user) return response.unauthorized({ message: 'User not authenticated' })

    try {
      const { paymentIntentId } = processPaymentSchema.parse(request.body())

      const result = await prisma.$transaction(async (tx) => {
        return await this.checkoutService.processPayment(user.id, paymentIntentId, tx)
      })

      return response.ok(result)
    } catch (error) {

      if (error instanceof z.ZodError) {
        return response.badRequest({ message: 'Invalid input data', errors: error.errors })
      }

      if (error instanceof Error) {
        switch (error.message) {
          case 'Invalid payment intent':
          case 'Order not found':
          case 'Repo not found':
            return response.notFound({ message: error.message })
          case 'Payment has already been processed':
            return response.conflict({ message: error.message })
          case 'Seller not available':
          case 'Payment intent is not in a succeeded state':
          case 'Failed to grant access to the repo':
            return response.badRequest({ message: error.message })
          default:
            return response.internalServerError({
              message: 'An unexpected error occurred while processing payment',
            })
        }
      }

      return response.internalServerError({
        message: 'An error occurred while processing payment',
      })
    }
  }
}
