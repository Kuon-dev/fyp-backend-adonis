import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'

/**
 * Controller class for handling Admin operations on Seller Profiles.
 */
@inject()
export default class AdminController {
  /**
   * Retrieve a Seller Profile by user ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the User/Seller.
   */
  public async getSellerProfile({ params, response }: HttpContext) {
    const { id } = params

    try {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: id },
        include: { bankAccount: true, user: true }
      })

      if (!sellerProfile) {
        return response.status(404).json({ message: 'Seller profile not found' })
      }

      return response.status(200).json(sellerProfile)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * Update a Seller Profile.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the User/Seller.
   * @bodyParam data - The data to update the Seller Profile.
   */
  public async updateSellerProfile({ params, request, response }: HttpContext) {
    const { email } = params
    const data = request.only([
      'businessName',
      'businessAddress',
      'businessPhone',
      'businessEmail',
      'accountHolderName',
      'accountNumber',
      'bankName',
      'swiftCode',
      'iban',
      'routingNumber'
    ])

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return response.status(404).json({ message: 'User not found' })
    }

    try {
      const updatedProfile = await prisma.sellerProfile.update({
        where: { userId: user.id},
        data: {
          businessName: data.businessName,
          businessAddress: data.businessAddress,
          businessPhone: data.businessPhone,
          businessEmail: data.businessEmail,
          bankAccount: {
            upsert: {
              create: {
                accountHolderName: data.accountHolderName,
                accountNumber: data.accountNumber,
                bankName: data.bankName,
                swiftCode: data.swiftCode,
                iban: data.iban,
                routingNumber: data.routingNumber,
              },
              update: {
                accountHolderName: data.accountHolderName,
                accountNumber: data.accountNumber,
                bankName: data.bankName,
                swiftCode: data.swiftCode,
                iban: data.iban,
                routingNumber: data.routingNumber,
              },
            },
          },
        },
        include: { bankAccount: true }
      })

      return response.status(200).json(updatedProfile)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * List all Seller Profiles with pagination.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of items per page.
   */
  public async listSellerProfiles({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const skip = (page - 1) * limit

    try {
      const [sellerProfiles, total] = await prisma.$transaction([
        prisma.sellerProfile.findMany({
          skip,
          take: limit,
          include: { user: true, bankAccount: true }
        }),
        prisma.sellerProfile.count()
      ])

      return response.status(200).json({
        data: sellerProfiles,
        meta: {
          total,
          page,
          limit
        }
      })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * Verify a Seller Profile.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the User/Seller.
   * @bodyParam status - The verification status to set.
   */
  public async verifySellerProfile({ params, request, response }: HttpContext) {
    const { id } = params
    const { status } = request.only(['status'])

    try {
      const updatedProfile = await prisma.sellerProfile.update({
        where: { userId: id },
        data: {
          verificationStatus: status,
          verificationDate: new Date()
        }
      })

      return response.status(200).json(updatedProfile)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * Ban a user.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the User/Seller.
   * @bodyParam banUntil - The date until which the user is banned.
   */
  public async banUser({ params, request, response }: HttpContext) {
    const { id } = params
    const { banUntil } = request.only(['banUntil'])

    try {
      const bannedUser = await prisma.user.update({
        where: { id },
        data: {
          bannedUntil: new Date(banUntil)
        }
      })

      return response.status(200).json(bannedUser)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async unbanUser({ params, response }: HttpContext) {
    const { id } = params
    try {
      const unbanUser = await prisma.user.update({
        where: { id },
        data: {
          bannedUntil: null
        }
      })
      return response.status(200).json(unbanUser)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }
}
