import { inject } from '@adonisjs/core'
import Stripe from 'stripe'
import env from '#start/env'
import { Exception } from '@adonisjs/core/exceptions'

@inject()
export default class StripeFacade {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10', // Use the latest API version
    })
  }

  /**
   * Create a payment intent for a purchase
   * @param amount The amount to charge (in cents)
   * @param currency The currency to use (e.g., 'usd')
   * @param customerId The Stripe Customer ID
   * @param accountId The Stripe Connect account ID to receive the funds
   * @returns The PaymentIntent object
   */
  async createPaymentIntent(amount: number, currency: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
      })
      return paymentIntent
    } catch (error) {
      throw new Exception('Failed to create payment intent', {
        code: 'E_STRIPE_PAYMENT_INTENT_CREATION',
        status: 500,
      })
    }
  }

  async createPaymentIntentForRepo(
    amount: number,
    currency: string,
    sellerId: string,
    repoId: string
  ) {
    try {
      const paymentIntent = await this.createPaymentIntent(amount, currency)

      // Update the payment intent with metadata
      const updatedPaymentIntent = await this.stripe.paymentIntents.update(paymentIntent.id, {
        metadata: { repoId, sellerId },
      })

      return updatedPaymentIntent
    } catch (error) {
      throw new Exception('Failed to create payment intent for repo', {
        code: 'E_STRIPE_PAYMENT_INTENT_CREATION',
        status: 500,
      })
    }
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (error) {
      throw new Exception('Failed to retrieve payment intent', {
        code: 'E_STRIPE_PAYMENT_INTENT_RETRIEVAL',
        status: 500,
      })
    }
  }

  async confirmPaymentIntent(paymentIntentId: string) {
    try {
      return await this.stripe.paymentIntents.confirm(paymentIntentId)
    } catch (error) {
      throw new Exception('Failed to confirm payment intent', {
        code: 'E_STRIPE_PAYMENT_INTENT_CONFIRMATION',
        status: 500,
      })
    }
  }
}
