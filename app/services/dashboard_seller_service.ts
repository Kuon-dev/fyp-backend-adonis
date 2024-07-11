import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import SellerOnboardingService from '#services/seller_onboarding_service'
import { createConnectAccountSchema } from '#validators/seller_onboarding'
import UnAuthorizedException from '#exceptions/un_authorized_exception'

@inject()
export default class SellerOnboardingController {
  constructor(protected sellerOnboardingService: SellerOnboardingService) {}

  /**
   * @createConnectAccount
   * @description Create a Stripe Connect account for the user and return the onboarding URL
   * @requestBody {
   *   "businessName": "Example Business",
   *   "businessType": "individual"
   * }
   * @responseBody 200 - {
   *   "onboardingUrl": "https://connect.stripe.com/setup/s/..."
   * }
   * @responseBody 400 - { "message": "Invalid input. Business name and type are required." }
   * @responseBody 500 - { "message": "An error occurred while creating the Stripe account." }
   */
  async createConnectAccount({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createConnectAccountSchema)
    const userId = request.user?.id

    if (!userId) {
      throw new UnAuthorizedException();
    }

    try {
      const onboardingUrl = await this.sellerOnboardingService.createConnectAccount(userId, payload)
      return response.ok({ onboardingUrl })
    } catch (error) {
      if (error instanceof UnAuthorizedException) {
        return response.unauthorized({ message: error.message });
      }
      return response.internalServerError({
        message: 'An error occurred while creating the Stripe account.',
        error: error.message,
      })
    }
  }

  /**
   * @onboardingComplete
   * @description Handle the Stripe onboarding completion callback
   * @responseBody 200 - { "message": "Onboarding completed successfully" }
   * @responseBody 400 - { "message": "Invalid request" }
   * @responseBody 500 - { "message": "An error occurred while processing the onboarding completion" }
   */
  async onboardingComplete({ request, response }: HttpContext) {
    const { accountId } = request.qs()

    if (!accountId) {
      return response.badRequest({ message: 'Invalid request' })
    }

    try {
      await this.sellerOnboardingService.handleOnboardingComplete(accountId)
      return response.ok({ message: 'Onboarding completed successfully' })
    } catch (error) {
      return response.internalServerError({
        message: 'An error occurred while processing the onboarding completion',
        error: error.message,
      })
    }
  }

  /**
   * @verifyAccountStatus
   * @description Verify the Stripe account status for the authenticated user
   * @responseBody 200 - {
   *   "isVerified": true,
   *   "accountStatus": "active"
   * }
   * @responseBody 404 - { "message": "Stripe account not found" }
   * @responseBody 500 - { "message": "An error occurred while verifying the account status" }
   */
  async verifyAccountStatus({ request, response }: HttpContext) {
    const userId = request.user?.id

    if (!userId) {
      throw new UnAuthorizedException();
    }

    try {

      const status = await this.sellerOnboardingService.verifyAccountStatus(userId)
      return response.ok(status)
    } catch (error) {
      if (error.message === 'Stripe account not found') {
        return response.notFound({ message: error.message })
      }
      return response.internalServerError({
        message: 'An error occurred while verifying the account status',
        error: error.message,
      })
    }
  }

  /**
   * @updateSellerProfile
   * @description Update the user's profile to indicate they're a verified seller
   * @responseBody 200 - { "message": "Seller profile updated successfully" }
   * @responseBody 404 - { "message": "User or seller profile not found" }
   * @responseBody 500 - { "message": "An error occurred while updating the seller profile" }
   */
  async updateSellerProfile({ response, request }: HttpContext) {
    const userId = request.user?.id

    if (!userId) {
      throw new UnAuthorizedException();
    }

    try {
      await this.sellerOnboardingService.updateSellerProfile(userId)
      return response.ok({ message: 'Seller profile updated successfully' })
    } catch (error) {
      if (error.message === 'User or seller profile not found') {
        return response.notFound({ message: error.message })
      }
      return response.internalServerError({
        message: 'An error occurred while updating the seller profile',
        error: error.message,
      })
    }
  }
}
