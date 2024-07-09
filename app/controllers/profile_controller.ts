// controllers/ProfileController.ts
import { HttpContext } from '@adonisjs/core/http'
import { ProfileService } from '#services/profile_service'
import { inject } from '@adonisjs/core';
import { prisma } from '#services/prisma_service'
import { S3Facade } from '#integrations/s3/s3_facade'

@inject()
export default class ProfileController {
  constructor(protected profileService: ProfileService, protected s3Facade: S3Facade) {}

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

      let profileData: {name?: string, phoneNumber?: string } = { name, phoneNumber }
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
   * @updateProfile
   * @description Update the authenticated user's profile
   * @requestBody {
   *   "profileImg": <file>,
   *   "name": "Jane Doe",
   *   "phoneNumber": "+9876543210"
   * }
   * @responseBody 200 - { "profile": { "id": "...", "name": "...", "phoneNumber": "...", "userId": "..." }, "signedUrl": "..." }
   * @responseBody 400 - { "message": "Invalid input data" }
   * @responseBody 404 - { "message": "Profile not found" }
   */
  async updateProfile({ request, response }: HttpContext) {
    const user = request.user!
    
    try {
      return new Promise<void>((resolve, reject) => {
        request.multipart.onFile('profileImg', {}, async (part) => {
          try {
            part.pause()
            
            const chunks: Buffer[] = []
            for await (const chunk of part) {
              chunks.push(chunk)
            }
            const buffer = Buffer.concat(chunks)
            const fileType = part.headers['content-type']

            const result = await prisma.$transaction(async (tx) => {
              const { media, signedUrl } = await this.s3Facade.uploadFile(buffer, fileType, tx)

              // Update user's profile with the new image URL
              const updatedProfile = await tx.profile.upsert({
                where: { userId: user.id },
                update: { profileImg: media.url },
                create: { userId: user.id, profileImg: media.url }
              })

              return { profile: updatedProfile, signedUrl }
            })

            response.status(200).json(result)
            resolve()
          } catch (error) {
            console.error('Profile image upload error:', error)
            response.status(500).json({ error: 'Profile image upload failed' })
            reject(error)
          }
        })

        request.multipart.process()
      })
    } catch (error) {
      console.error('Multipart processing error:', error)
      return response.status(500).json({ error: 'File processing failed' })
    }
  }}
