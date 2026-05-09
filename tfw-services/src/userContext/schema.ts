import { z } from 'zod';

export const createUserContextSchema = z.object({
  user_id: z.string().min(1),
  icp_json: z.record(z.unknown()).optional(),
  coaching_step: z.string().optional(),
  onboarding: z.record(z.unknown()).optional(),
});

export const updateUserContextSchema = z.object({
  icp_json: z.record(z.unknown()).optional(),
  coaching_step: z.string().optional(),
  onboarding: z.record(z.unknown()).optional(),
});

export type CreateUserContextBody = z.infer<typeof createUserContextSchema>;
export type UpdateUserContextBody = z.infer<typeof updateUserContextSchema>;
