import { z } from "zod";

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
  language: z.string().min(1, "Language is required"),
  chatHistory: z.array(z.tuple([z.string(), z.string()])).optional(),
});

export type CodeCheckRequest = z.infer<typeof codeCheckRequestSchema>;
