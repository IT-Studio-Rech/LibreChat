import { z } from 'zod';

const platformSchema = z.enum(['linkedin', 'instagram', 'other']);
const statusSchema = z.enum(['cold', 'warm', 'hot', 'closed']);

export const createLeadSchema = z.object({
  user_id: z.string().min(1),
  lead_name: z.string().min(1),
  platform: platformSchema.optional(),
  status: statusSchema.optional(),
  notes: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.coerce.date().optional(),
  chat_snippets: z
    .array(z.object({ snippet: z.string(), date: z.coerce.date() }))
    .optional(),
});

export const updateLeadSchema = z.object({
  lead_name: z.string().min(1).optional(),
  platform: platformSchema.optional(),
  status: statusSchema.optional(),
  notes: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.coerce.date().optional(),
  chat_snippets: z
    .array(z.object({ snippet: z.string(), date: z.coerce.date() }))
    .optional(),
});

export const listLeadsQuerySchema = z.object({
  filter: z.enum(['due']).optional(),
  status: statusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateLeadBody = z.infer<typeof createLeadSchema>;
export type UpdateLeadBody = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
