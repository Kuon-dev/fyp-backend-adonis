// app/validators/payout.ts
import { z } from 'zod'

export const createPayoutSchema = z.object({
  sellerProfileId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
})

export const updatePayoutSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  stripePayoutId: z.string().optional(),
})

export type CreatePayoutDTO = z.infer<typeof createPayoutSchema>
export type UpdatePayoutDTO = z.infer<typeof updatePayoutSchema>
