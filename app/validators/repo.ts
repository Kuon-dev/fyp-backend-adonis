import { z } from 'zod'

// Enum for Language
const LanguageEnum = z.enum(['JSX', 'TSX'])

// Enum for Visibility
const VisibilityEnum = z.enum(['public', 'private'])

// Enum for CodeRepoStatus
const CodeRepoStatusEnum = z.enum(['pending', 'active', 'rejected', 'bannedUser'])

// Schema for creating a new repo
export const createRepoSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  language: LanguageEnum,
  price: z.number().nonnegative().default(0.0),
  tags: z.array(z.string()),
  visibility: VisibilityEnum.default('public'),
  //sourceJs: z.string(),
  //sourceCss: z.string(),
})

// Schema for updating a repo
export const updateRepoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  language: LanguageEnum.optional(),
  price: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  visibility: VisibilityEnum.optional(),
  status: CodeRepoStatusEnum.optional(),
  sourceJs: z.string().optional(),
  sourceCss: z.string().optional(),
  //stripeProductId: z.string().nullable().optional(),
  //stripePriceId: z.string().nullable().optional(),
})

export const publishRepoSchema = z.object({
  id: z.string(),
  userId: z.string()
})
