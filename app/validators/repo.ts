
import { prisma } from '#services/prisma_service';
import { z } from 'zod';

export const repoIdsSchema = z.object({
  repoIds: z.array(z.string()).min(1, { message: "At least one repoId must be provided" })
});

// Define the common schema for CodeRepo
const codeRepoBaseSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  language: z.string(),
  price: z.number().min(0, { message: "Price must be a positive number" }),
  tags: z.array(z.string()),
  sourceJs: z.string().optional(),
  sourceCss: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

// Schema for creating a new CodeRepo
export const createCodeRepoSchema = codeRepoBaseSchema.extend({
  sourceJs: z.string(),
  sourceCss: z.string(),
});

// Schema for updating an existing CodeRepo
export const updateCodeRepoSchema = codeRepoBaseSchema.partial().extend({
  id: z.string(),
  deletedAt: z.date().optional().nullable(),
  stripeProductId: z.string().optional().nullable(),
  stripePriceId: z.string().optional().nullable(),
});

// Schema for reading a CodeRepo by ID
export const readCodeRepoSchema = z.object({
  id: z.string(),
});

// Schema for deleting a CodeRepo by ID
export const deleteCodeRepoSchema = z.object({
  id: z.string(),
});

export interface CodeRepoStrategy {
  validate(data: any): Promise<void>;
}

export class ZodCreateCodeRepoStrategy implements CodeRepoStrategy {
  async validate(data: any): Promise<void> {
    createCodeRepoSchema.parse(data);
  }
}

export class ZodUpdateCodeRepoStrategy implements CodeRepoStrategy {
  async validate(data: any): Promise<void> {
    updateCodeRepoSchema.parse(data);
  }
}

export class ZodReadCodeRepoStrategy implements CodeRepoStrategy {
  async validate(data: any): Promise<void> {
    readCodeRepoSchema.parse(data);
  }
}

export class ZodDeleteCodeRepoStrategy implements CodeRepoStrategy {
  async validate(data: any): Promise<void> {
    deleteCodeRepoSchema.parse(data);
  }
}

export class CodeRepoValidator {
  private strategies: CodeRepoStrategy[] = [];

  addStrategy(strategy: CodeRepoStrategy): void {
    this.strategies.push(strategy);
  }

  async validate(data: any): Promise<void> {
    for (const strategy of this.strategies) {
      await strategy.validate(data);
    }
  }
}
