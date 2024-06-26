import { z } from "zod";

export const codeCheckSchema = z.object({
  score: z.number().min(0).max(10),
  // message: z.string(),
  description: z.string(),
  suggestion: z.string(),
});
