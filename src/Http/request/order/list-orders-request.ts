import { z } from 'zod';

import { ORDER_STATUS_FILTERS } from '../../../value-object/order-status-value-object.js';

export const listOrdersSessionSchema = z.object({ userId: z.string().uuid() });
export const listOrdersQuerySchema = z.strictObject({
  status: z.enum(ORDER_STATUS_FILTERS, {
    error: 'O status deve ser pending, withdrawn ou cancelled.',
  }).optional(),
});

export type ListOrdersRequest = z.infer<typeof listOrdersQuerySchema>;
