import { z } from 'zod';
import { productIdSchema } from './product-fields.js';

export const deleteProductParamsSchema = z.strictObject({ id: productIdSchema });

export type DeleteProductRequest = z.infer<typeof deleteProductParamsSchema>;
