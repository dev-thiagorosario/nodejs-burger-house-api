import { z } from 'zod';
import { productIdSchema } from './product-fields.js';

export const getProductByIdParamsSchema = z.strictObject({ id: productIdSchema });

export type GetProductByIdRequest = z.infer<typeof getProductByIdParamsSchema>;
