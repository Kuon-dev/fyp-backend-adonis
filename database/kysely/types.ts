import type { ColumnType } from 'kysely'
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>
export type Timestamp = ColumnType<Date, Date | string, Date | string>

import type {
  Role,
  SellerVerificationStatus,
  CodeRepoStatus,
  Visibility,
  Language,
  OrderStatus,
  SupportTicketStatus,
  SupportTicketType,
} from './enums'

export type CodeCheck = {
  id: string
  repoId: string
  securityScore: number
  maintainabilityScore: number
  readabilityScore: number
  securitySuggestion: string
  maintainabilitySuggestion: string
  readabilitySuggestion: string
  overallDescription: string
  eslintErrorCount: number
  eslintFatalErrorCount: number
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type CodeRepo = {
  id: string
  userId: string
  sourceJs: string
  sourceCss: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  deletedAt: Timestamp | null
  visibility: Generated<Visibility>
  status: Generated<CodeRepoStatus>
  name: string
  description: string | null
  language: Language
  price: Generated<number>
}
export type Comment = {
  id: string
  content: string
  userId: string
  reviewId: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  deletedAt: Timestamp | null
  flag: Generated<number | null>
  upvotes: Generated<number>
  downvotes: Generated<number>
}
export type emailVerificationCode = {
  id: string
  code: string
  userId: string
  email: string
  expiresAt: Timestamp
}
export type Media = {
  id: string
  url: string
  type: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type Order = {
  id: string
  userId: string
  codeRepoId: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  deletedAt: Timestamp | null
  status: Generated<OrderStatus>
  totalAmount: number
}
export type PasswordResetToken = {
  id: Generated<number>
  tokenHash: string
  userId: string
  expiresAt: Timestamp
}
export type Profile = {
  id: string
  profileImg: string | null
  name: string | null
  phoneNumber: string | null
  userId: string
}
export type Review = {
  id: string
  content: string
  userId: string
  repoId: string
  rating: Generated<number>
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  deletedAt: Timestamp | null
  flag: Generated<number | null>
  upvotes: Generated<number>
  downvotes: Generated<number>
}
export type SalesAggregate = {
  id: string
  sellerId: string
  date: Timestamp
  revenue: number
  salesCount: number
}
export type SearchHistory = {
  id: string
  userId: string
  tag: string
  createdAt: Generated<Timestamp>
}
export type SellerProfile = {
  id: string
  userId: string
  profileImg: string | null
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail: string
  identityDoc: string | null
  verificationDate: Timestamp | null
  stripeAccountId: string | null
  verificationStatus: Generated<SellerVerificationStatus>
}
export type Session = {
  id: string
  userId: string
  expiresAt: Timestamp
}
export type SupportTicket = {
  id: string
  email: string
  title: string
  content: string
  status: Generated<SupportTicketStatus>
  type: Generated<SupportTicketType>
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type Tag = {
  id: string
  name: string
  repoId: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  deletedAt: Timestamp | null
}
export type User = {
  id: string
  email: string
  passwordHash: string
  emailVerified: Generated<boolean>
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  deletedAt: Timestamp | null
  bannedUntil: Timestamp | null
  role: Generated<Role>
}
export type DB = {
  CodeCheck: CodeCheck
  CodeRepo: CodeRepo
  Comment: Comment
  emailVerificationCode: emailVerificationCode
  Media: Media
  Order: Order
  PasswordResetToken: PasswordResetToken
  Profile: Profile
  Review: Review
  SalesAggregate: SalesAggregate
  SearchHistory: SearchHistory
  SellerProfile: SellerProfile
  Session: Session
  SupportTicket: SupportTicket
  Tag: Tag
  User: User
}
