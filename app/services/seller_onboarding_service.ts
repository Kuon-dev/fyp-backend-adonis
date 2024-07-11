import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import StripeFacade from '#integrations/stripe/stripe_facade'
import { CreateConnectAccountPayload } from '#validators/seller_onboarding'
import { Exception } from '@adonisjs/core/exceptions'

@inject()
export default class SellerOnboardingService {
  constructor(protected stripeFacade: StripeFacade) {}

  async createConnectAccount(userId: string, payload: CreateConnectAccountPayload): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Exception('User not found', { code: 'E_USER_NOT_FOUND', status: 404 })
    }

    const { businessName, businessType } = payload

    try {
      const stripeAccount = await this.stripeFacade.createConnectAccount(user.email, businessName, businessType)

      await prisma.sellerProfile.create({
        data: {
          userId,
          businessName,
          stripeAccountId: stripeAccount.id,
        },
      })

      return stripeAccount.onboardingUrl
    } catch (error) {
      console.error('Error creating Connect account:', error)
      if (error instanceof Exception) {
        throw error  // Re-throw if it's already our custom Exception
      }
      throw new Exception('Failed to create Stripe Connect account', { code: 'E_STRIPE_CONNECT_CREATION', status: 500 })
    }
  }

  async handleOnboardingComplete(accountId: string): Promise<void> {
    const sellerProfile = await prisma.sellerProfile.findFirst({ where: { stripeAccountId: accountId } })
    if (!sellerProfile) {
      throw new Exception('Seller profile not found', { code: 'E_SELLER_PROFILE_NOT_FOUND', status: 404 })
    }

    try {
      const accountStatus = await this.stripeFacade.getAccountStatus(accountId)

      await prisma.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: {
          verificationStatus: accountStatus.details_submitted ? 'submitted' : 'pending',
          verificationDate: accountStatus.details_submitted ? new Date() : null,
        },
      })
    } catch (error) {
      console.error('Error handling onboarding completion:', error)
      if (error instanceof Exception) {
        throw error  // Re-throw if it's already our custom Exception
      }
      throw new Exception('Failed to handle onboarding completion', { code: 'E_ONBOARDING_COMPLETION', status: 500 })
    }
  }

  async verifyAccountStatus(userId: string): Promise<{ isVerified: boolean; accountStatus: string }> {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } })
    if (!sellerProfile) {
      throw new Exception('Stripe account not found', { code: 'E_STRIPE_ACCOUNT_NOT_FOUND', status: 404 })
    }

    try {
      const isFullyOnboarded = await this.stripeFacade.isAccountFullyOnboarded(sellerProfile.stripeAccountId)

      return {
        isVerified: isFullyOnboarded,
        accountStatus: isFullyOnboarded ? 'active' : 'pending',
      }
    } catch (error) {
      console.error('Error verifying account status:', error)
      if (error instanceof Exception) {
        throw error  // Re-throw if it's already our custom Exception
      }
      throw new Exception('Failed to verify account status', { code: 'E_ACCOUNT_STATUS_VERIFICATION', status: 500 })
    }
  }

  async updateSellerProfile(userId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } })
        if (!user) {
          throw new Exception('User not found', { code: 'E_USER_NOT_FOUND', status: 404 })
        }

        const sellerProfile = await tx.sellerProfile.findUnique({ where: { userId } })
        if (!sellerProfile) {
          throw new Exception('Seller profile not found', { code: 'E_SELLER_PROFILE_NOT_FOUND', status: 404 })
        }

        const isFullyOnboarded = await this.stripeFacade.isAccountFullyOnboarded(sellerProfile.stripeAccountId)

        if (!isFullyOnboarded) {
          throw new Exception('Seller account is not fully onboarded', { code: 'E_SELLER_NOT_ONBOARDED', status: 400 })
        }

        await tx.user.update({
          where: { id: userId },
          data: { role: 'SELLER', isSellerVerified: true },
        })

        await tx.sellerProfile.update({
          where: { id: sellerProfile.id },
          data: { verificationStatus: 'verified', verificationDate: new Date() },
        })
      })
    } catch (error) {
      console.error('Error updating seller profile:', error)
      if (error instanceof Exception) {
        throw error  // Re-throw if it's already our custom Exception
      }
      throw new Exception('Failed to update seller profile', { code: 'E_SELLER_PROFILE_UPDATE', status: 500 })
    }
  }
}
