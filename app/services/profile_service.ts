import { prisma } from '#services/prisma_service'
import { z } from 'zod'
import { s3Facade } from '#integrations/s3/s3_facade'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { Request } from '@adonisjs/core/http'

const createProfileSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
})

export class ProfileService {
  /**
   * @createProfile
   * @description Create a new user profile
   * @param {string} userId - The ID of the user
   * @param {object} profileData - The profile data to be created
   * @returns {Promise<object>} The created profile and signed URL for the profile image
   */
  async createProfile(userId: string, profileData: z.infer<typeof createProfileSchema>) {
    const validatedData = createProfileSchema.parse(profileData)

    return await prisma.$transaction(async (tx) => {
      const existingProfile = await tx.profile.findUnique({ where: { userId } })
      if (existingProfile) {
        throw new Error('Profile already exists for this user')
      }

      let mediaId: string | undefined
      let signedUrl: string | undefined

      const profile = await tx.profile.create({
        data: {
          name: validatedData.name,
          phoneNumber: validatedData.phoneNumber,
          profileImg: mediaId ?? null,
          user: { connect: { id: userId } },
        },
      })

      return { profile, signedUrl }
    })
  }

  /**
   * @getProfile
   * @description Get a user's profile
   * @param {string} userId - The ID of the user
   * @returns {Promise<object | null>} The user's profile or null if not found
   */
  async getProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: true },
    })

    if (profile && profile.profileImg) {
      const media = await prisma.media.findUnique({ where: { id: profile.profileImg } })
      if (media) {
        const signedUrl = await s3Facade.getSignedUrl(media.url.split('/').pop()!)
        return { ...profile, profileImgUrl: signedUrl }
      }
    }

    return profile
  }
}
