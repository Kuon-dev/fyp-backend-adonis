// app/validators/payout.ts
import { z } from 'zod'

export const createPayoutSchema = z.object({
  sellerProfileId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  payoutRequestId: z.string(),
})

export type CreatePayoutDTO = z.infer<typeof createPayoutSchema>
