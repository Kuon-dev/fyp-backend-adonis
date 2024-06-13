import { z } from 'zod';

export const CreateOrderSchema = z.object({
  userId: z.string().uuid(),
  codeRepoId: z.string().uuid(),
  totalAmount: z.number().positive(),
});

export const UpdateOrderSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  totalAmount: z.number().positive().optional(),
});

