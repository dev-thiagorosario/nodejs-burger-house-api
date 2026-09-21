import { z } from 'zod';

export const getCurrentUserRequestSchema = z.object({
  userId: z.string().min(1),
});

export type GetCurrentUserRequest = z.infer<typeof getCurrentUserRequestSchema>;
