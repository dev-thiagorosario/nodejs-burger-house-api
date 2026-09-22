import { z } from 'zod';

import { cartSummaryBodySchema } from '../cart/cart-summary-request.js';

export const createOrderBodySchema = cartSummaryBodySchema;

export const createOrderSessionSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateOrderRequest = z.infer<typeof createOrderBodySchema>;
