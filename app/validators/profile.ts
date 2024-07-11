import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  //profileImg: z.string().optional(),
})
