import { z } from 'zod';

export const listOrdersSessionSchema = z.object({ userId: z.string().uuid() });
export const listOrdersQuerySchema = z.strictObject({});
