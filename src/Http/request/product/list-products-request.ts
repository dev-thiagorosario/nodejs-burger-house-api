import { z } from 'zod';

export const listProductsQuerySchema = z.strictObject({
  categoryId: z.enum(['1', '2', '3'], {
    error: 'A categoria deve ser Hamburguer (1), Porcoes (2) ou Bebidas (3).',
  }).transform(Number).optional(),
});

export type ListProductsRequest = z.infer<typeof listProductsQuerySchema>;
