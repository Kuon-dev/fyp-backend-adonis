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
   * Create a Stripe Connect account and return the onboarding URL
   * @param email The email of the user
   * @param businessName The name of the business
   * @param businessType The type of the business ('individual' or 'company')
   * @returns An object containing the Stripe account ID and onboarding URL
   */
  async createConnectAccount(
    email: string,
    businessName: string,
    businessType: 'individual' | 'company'
  ): Promise<{ id: string; onboardingUrl: string }> {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email,
        business_type: businessType,
        business_profile: {
          name: businessName,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${env.get('APP_URL')}/seller/onboarding/refresh`,
        return_url: `${env.get('APP_URL')}/api/v1/stripe/onboarding-complete?accountId=${account.id}`,
        type: 'account_onboarding',
      })

      return {
        id: account.id,
        onboardingUrl: accountLink.url,
      }
    } catch (error) {
      console.error('Stripe account creation error:', error)
      throw new Exception('Failed to create Stripe account', {
        code: 'E_STRIPE_ACCOUNT_CREATION',
        status: 500,
      })
    }
  }

  /**
   * Get the status of a Stripe Connect account
   * @param accountId The Stripe account ID
   * @returns An object containing the account's verification status
   */
  async getAccountStatus(accountId: string): Promise<Stripe.Account> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId)
      return account
    } catch (error) {
      console.error('Stripe account status retrieval error:', error)
      throw new Exception('Failed to retrieve Stripe account status', {
        code: 'E_STRIPE_ACCOUNT_STATUS',
        status: 500,
      })
    }
  }

  /**
   * Check if a Stripe Connect account is fully onboarded and ready to accept payments
   * @param accountId The Stripe account ID
   * @returns A boolean indicating if the account is fully onboarded
   */
  async isAccountFullyOnboarded(accountId: string): Promise<boolean> {
    const account = await this.getAccountStatus(accountId)
    return (
      account.charges_enabled &&
      account.payouts_enabled &&
      account.capabilities?.card_payments === 'active' &&
      account.capabilities?.transfers === 'active'
    )
  }

  /**
   * Create a Stripe Customer for a user
   * @param email The email of the user
   * @param name The name of the user
   * @returns The Stripe Customer object
   */
  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      })
      return customer
    } catch (error) {
      console.error('Stripe customer creation error:', error)
      throw new Exception('Failed to create Stripe customer', {
        code: 'E_STRIPE_CUSTOMER_CREATION',
        status: 500,
      })
    }
  }

  /**
   * Create a payment intent for a purchase
   * @param amount The amount to charge (in cents)
   * @param currency The currency to use (e.g., 'usd')
   * @param customerId The Stripe Customer ID
   * @param accountId The Stripe Connect account ID to receive the funds
   * @returns The PaymentIntent object
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    accountId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        transfer_data: {
          destination: accountId,
        },
      })
      return paymentIntent
    } catch (error) {
      console.error('Stripe payment intent creation error:', error)
      throw new Exception('Failed to create payment intent', {
        code: 'E_STRIPE_PAYMENT_INTENT_CREATION',
        status: 500,
      })
    }
  }
}
