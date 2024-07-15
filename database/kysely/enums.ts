export const Role = {
    USER: "USER",
    ADMIN: "ADMIN",
    MODERATOR: "MODERATOR",
    SELLER: "SELLER"
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const SellerVerificationStatus = {
    IDLE: "IDLE",
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED"
} as const;
export type SellerVerificationStatus = (typeof SellerVerificationStatus)[keyof typeof SellerVerificationStatus];
export const PayoutRequestStatus = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    PROCESSED: "PROCESSED"
} as const;
export type PayoutRequestStatus = (typeof PayoutRequestStatus)[keyof typeof PayoutRequestStatus];
export const PayoutStatus = {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];
export const CodeRepoStatus = {
    pending: "pending",
    active: "active",
    rejected: "rejected",
    bannedUser: "bannedUser"
} as const;
export type CodeRepoStatus = (typeof CodeRepoStatus)[keyof typeof CodeRepoStatus];
export const Visibility = {
    public: "public",
    private: "private"
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];
export const Language = {
    JSX: "JSX",
    TSX: "TSX"
} as const;
export type Language = (typeof Language)[keyof typeof Language];
export const OrderStatus = {
    REQUIRESPAYMENTMETHOD: "REQUIRESPAYMENTMETHOD",
    REQUIRESCONFIRMATION: "REQUIRESCONFIRMATION",
    REQUIRESACTION: "REQUIRESACTION",
    PROCESSING: "PROCESSING",
    REQUIRESCAPTURE: "REQUIRESCAPTURE",
    CANCELLED: "CANCELLED",
    SUCCEEDED: "SUCCEEDED"
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export const UserCommentFlag = {
    NONE: "NONE",
    SPAM: "SPAM",
    INAPPROPRIATE_LANGUAGE: "INAPPROPRIATE_LANGUAGE",
    HARASSMENT: "HARASSMENT",
    OFF_TOPIC: "OFF_TOPIC",
    FALSE_INFORMATION: "FALSE_INFORMATION",
    OTHER: "OTHER"
} as const;
export type UserCommentFlag = (typeof UserCommentFlag)[keyof typeof UserCommentFlag];
export const VoteType = {
    UPVOTE: "UPVOTE",
    DOWNVOTE: "DOWNVOTE"
} as const;
export type VoteType = (typeof VoteType)[keyof typeof VoteType];
export const SupportTicketStatus = {
    inProgress: "inProgress",
    todo: "todo",
    backlog: "backlog",
    done: "done"
} as const;
export type SupportTicketStatus = (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];
export const SupportTicketType = {
    general: "general",
    technical: "technical",
    payment: "payment"
} as const;
export type SupportTicketType = (typeof SupportTicketType)[keyof typeof SupportTicketType];
