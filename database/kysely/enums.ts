export const Role = {
    USER: "USER",
    ADMIN: "ADMIN",
    MODERATOR: "MODERATOR",
    SELLER: "SELLER"
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const CodeRepoStatus = {
    pending: "pending",
    active: "active",
    rejected: "rejected"
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
    pending: "pending",
    completed: "completed",
    cancelled: "cancelled"
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
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
