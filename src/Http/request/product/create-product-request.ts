import { z } from 'zod';
import { productFields, productIdSchema } from './product-fields.js';

export const createProductBodySchema = z.strictObject({
  id: productIdSchema,
  ...productFields,
  imageAlt: productFields.imageAlt.optional(),
  isActive: productFields.isActive.optional(),
});

export type CreateProductRequest = z.infer<typeof createProductBodySchema>;
