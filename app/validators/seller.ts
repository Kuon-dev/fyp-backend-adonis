import { z } from 'zod'

export const bankAccountSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  swiftCode: z.string().min(8).max(11, 'SWIFT code must be 8 or 11 characters'),
  iban: z.string().optional(),
  routingNumber: z.string().optional()
})

export const createSellerProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessAddress: z.string().min(1, 'Business address is required'),
  businessPhone: z.string().min(1, 'Business phone is required'),
  businessEmail: z.string().email('Invalid email address'),
  bankAccount: bankAccountSchema
})

export const updateSellerProfileSchema = createSellerProfileSchema.partial()

export const createPayoutRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive')
})

export const updatePayoutRequestSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'])
})

export type CreateSellerProfileDto = z.infer<typeof createSellerProfileSchema>
export type UpdateSellerProfileDto = z.infer<typeof updateSellerProfileSchema>
export type CreatePayoutRequestDto = z.infer<typeof createPayoutRequestSchema>
export type UpdatePayoutRequestDto = z.infer<typeof updatePayoutRequestSchema>
