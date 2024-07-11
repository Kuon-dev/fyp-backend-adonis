import { z } from 'zod'

export const createConnectAccountSchema = z.object({
  businessName: z.string().min(1).max(255),
  businessType: z.enum(['individual', 'company']),
})

export type CreateConnectAccountPayload = z.infer<typeof createConnectAccountSchema>
