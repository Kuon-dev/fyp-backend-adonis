import { z } from "zod";
import { Language } from "@prisma/client";

export const codeCheckSchema = z.object({
  // New fields
  securityScore: z.number().min(0).max(100),
  maintainabilityScore: z.number().min(0).max(100),
  readabilityScore: z.number().min(0).max(100),
  securitySuggestion: z.string(),
  maintainabilitySuggestion: z.string(),
  readabilitySuggestion: z.string(),
  overallDescription: z.string(),
});

export const codeCheckRequestSchema = z.object({
  code: z.string().min(1, "Code is required"),
  language: z.enum([Language.JSX, Language.TSX]),
});

export type CodeCheckRequest = z.infer<typeof codeCheckRequestSchema>;
