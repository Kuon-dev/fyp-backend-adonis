// controllers/ProfileController.ts
import { HttpContext } from '@adonisjs/core/http'
import { ProfileService } from '#services/profile_service'
import { inject } from '@adonisjs/core'
import { prisma } from '#services/prisma_service'
import { S3Facade } from '#integrations/s3/s3_facade'
import { updateProfileSchema, updateSellerProfileSchema } from '#validators/profile'
import { Multipart } from '@adonisjs/core/bodyparser'
import { ZodError } from 'zod'
import InvalidImageException from '#exceptions/invalid_image_exception'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class ProfileController {
  constructor(
    protected profileService: ProfileService,
    protected s3Facade: S3Facade
  ) {}

  /**
   * @createProfile
   * @description Create a new user profile
   * @requestBody {
   *   "profileImg": <file>,
   *   "name": "John Doe",
   *   "phoneNumber": "+1234567890"
   * }
   * @responseBody 201 - { "profile": { "id": "...", "name": "...", "phoneNumber": "...", "userId": "..." }, "signedUrl": "..." }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 409 - { "message": "Profile already exists for this user" }
   */
  async createProfile({ request, response }: HttpContext) {
    try {
      const userId = request.user!.id
      const { name, phoneNumber } = request.only(['name', 'phoneNumber'])

      let profileData: { name?: string; phoneNumber?: string } = { name, phoneNumber }
      const result = await this.profileService.createProfile(userId, profileData)
      return response.created(result)
    } catch (error) {
      if (error instanceof Error) {
        return response.status(400).json({ message: error.message })
      }
      return response.status(500).json({ message: 'An error occurred while creating the profile' })
    }
  }

  /**
   * @getProfile
   * @description Get the authenticated user's profile
   * @responseBody 200 - { "id": "...", "name": "...", "phoneNumber": "...", "userId": "...", "profileImgUrl": "..." }
   * @responseBody 404 - { "message": "Profile not found" }
   */
  async getProfile({ request, response }: HttpContext) {
    const userId = request.user!.id
    const profile = await this.profileService.getProfile(userId)
    if (!profile) {
      return response.notFound({ message: 'Profile not found' })
    }
    return response.ok(profile)
  }

  /**
   * @updateSellerProfile
   * @description Update seller profile information including bank account details
   * @requestBody {
   *   "businessName": "My Business",
   *   "businessAddress": "123 Business St",
   *   "businessPhone": "+1234567890",
   *   "businessEmail": "business@example.com",
   *   "accountHolderName": "John Doe",
   *   "accountNumber": "1234567890",
   *   "bankName": "Example Bank",
   *   "swiftCode": "EXAMPLECODE",
   *   "iban": "GB29NWBK60161331926819",
   *   "routingNumber": "11122233"
   * }
   * @responseBody 200 - { "message": "Seller profile updated successfully", "status": "success" }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 500 - { "message": "Seller profile update failed" }
   */
  async updateSellerProfile({ request, response }: HttpContext) {
    const user = request.user!

    try {
      const sellerProfileData = request.only([
        'businessName',
        'businessAddress',
        'businessPhone',
        'businessEmail',
        'accountHolderName',
        'accountNumber',
        'bankName',
        'swiftCode',
        'iban',
        'routingNumber',
      ])

      const validatedData = updateSellerProfileSchema.parse(sellerProfileData)

      await prisma.$transaction(async (tx) => {
        // Update or create SellerProfile
        const updatedSellerProfile = await tx.sellerProfile.upsert({
          where: { userId: user.id },
          update: {
            businessName: validatedData.businessName,
            businessAddress: validatedData.businessAddress,
            businessPhone: validatedData.businessPhone,
            businessEmail: validatedData.businessEmail,
          },
          create: {
            userId: user.id,
            businessName: validatedData.businessName,
            businessAddress: validatedData.businessAddress,
            businessPhone: validatedData.businessPhone,
            businessEmail: validatedData.businessEmail,
          },
        })

        // Update or create BankAccount
        await tx.bankAccount.upsert({
          where: { sellerProfileId: updatedSellerProfile.id },
          update: {
            accountHolderName: validatedData.accountHolderName,
            accountNumber: validatedData.accountNumber,
            bankName: validatedData.bankName,
            swiftCode: validatedData.swiftCode,
            iban: validatedData.iban,
            routingNumber: validatedData.routingNumber,
          },
          create: {
            sellerProfileId: updatedSellerProfile.id,
            accountHolderName: validatedData.accountHolderName,
            accountNumber: validatedData.accountNumber,
            bankName: validatedData.bankName,
            swiftCode: validatedData.swiftCode,
            iban: validatedData.iban,
            routingNumber: validatedData.routingNumber,
          },
        })
      })

      return response.status(200).json({
        message: 'Seller profile updated successfully',
        status: 'success',
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return response.status(400).json({
          message: 'Validation failed',
          errors: error.errors,
        })
      } else {
        logger.error('Seller profile update failed:', error)
        return response.status(500).json({ message: 'Seller profile update failed' })
      }
    }
  }

  /*  /**
   * @updateProfile
   * @description Update user profile information and optionally upload a profile image
   * @requestBody {
   *   "name": "John Doe",
   *   "phoneNumber": "+1234567890",
   *   "profileImg": File (optional)
   * }
   * @responseBody 200 - { "message": "Profile updated successfully", "status": "success" }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 500 - { "message": "Profile update failed" }
   */
  async updateProfile({ request, response }: HttpContext) {
    const user = request.user!

    try {
      const { name, phoneNumber } = request.only(['name', 'phoneNumber'])
      updateProfileSchema.parse({ name, phoneNumber })

      if (!request.multipart) {
        await this.updateProfileWithoutImage(user.id, name, phoneNumber)
      } else {
        await this.updateProfileWithImage(user.id, name, phoneNumber, request.multipart)
      }

      return response.status(200).json({
        message: 'Profile updated successfully',
        status: 'success',
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return response.status(400).json({
          message: 'Validation failed',
        })
      }
      if (error instanceof InvalidImageException) {
        return response.status(400).json({ message: 'Invalid image format' })
      } else {
        logger.error('Profile update failed:', error)
      }
      return response.status(500).json({ message: 'Profile update failed' })
    }
  }

  private async updateProfileWithoutImage(userId: string, name: string, phoneNumber: string) {
    await prisma.profile.upsert({
      where: { userId },
      update: { name, phoneNumber },
      create: { name, phoneNumber, userId },
    })
  }

  private updateProfileWithImage(
    userId: string,
    name: string,
    phoneNumber: string,
    multipart: Multipart
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      multipart.onFile('profileImg', {}, async (part) => {
        try {
          // validate if it is an image
          if (!part.headers['content-type']?.startsWith('image/')) {
            return reject(new InvalidImageException())
          }
          const buffer = await this.readFileBuffer(part)
          const fileType = part.headers['content-type']

          await prisma.$transaction(async (tx) => {
            const { media } = await this.s3Facade.uploadFile(buffer, fileType, tx, 'profile-images')
            await tx.profile.upsert({
              where: { userId },
              update: { name, phoneNumber, profileImg: media.url },
              create: { userId, name, phoneNumber, profileImg: media.url },
            })
          })

          resolve()
        } catch (error) {
          console.error('Profile image upload error:', error)
          reject(error)
        }
      })

      multipart.process()
    })
  }

  private async readFileBuffer(part: any): Promise<Buffer> {
    part.pause()
    const chunks: Buffer[] = []
    for await (const chunk of part) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }
}
