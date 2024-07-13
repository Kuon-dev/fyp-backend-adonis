import { z } from 'zod'

export const createPayoutRequestSchema = z.object({
  totalAmount: z.number().positive(),
})

export const updatePayoutRequestSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED']).optional(),
})

export const processPayoutRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
})
