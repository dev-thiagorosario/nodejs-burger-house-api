import { z } from 'zod';

export const updateOrderStatusRequestSchema = z.object({
  params: z.strictObject({
    id: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2_147_483_647)),
  }),
  body: z.strictObject({ statusId: z.number().int().min(1).max(32_767) }),
});
