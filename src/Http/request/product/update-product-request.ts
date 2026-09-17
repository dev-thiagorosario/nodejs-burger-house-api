import { z } from 'zod';
import { productFields, productIdSchema } from './product-fields.js';

export const updateProductRequestSchema = z.object({
  params: z.strictObject({ id: productIdSchema }),
  body: z.strictObject(productFields).partial()
    .refine((body) => Object.values(body).some((value) => value !== undefined), 'Informe pelo menos um campo para atualizar.'),
});

export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
