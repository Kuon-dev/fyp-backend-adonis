import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  //profileImg: z.string().optional(),
})

export const updateSellerProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessAddress: z.string().min(1, 'Business address is required'),
  businessPhone: z.string().refine(isValidPhoneNumber, { message: 'Invalid phone number' }),
  businessEmail: z.string().email('Invalid email address'),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  swiftCode: z.string().min(8).max(11),
  iban: z.string().optional(),
  routingNumber: z.string().optional(),
})
