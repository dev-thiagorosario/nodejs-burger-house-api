import { z } from 'zod';
import { productIdSchema } from '../product/product-fields.js';

export const cartSummaryBodySchema = z.strictObject({
  items: z.array(z.strictObject({
    productId: productIdSchema,
    quantity: z.number('Informe uma quantidade numérica.')
      .int('A quantidade deve ser um número inteiro.')
      .min(1, 'A quantidade deve ser maior ou igual a um.'),
  }), 'Informe os itens do carrinho.').min(1, 'O carrinho deve conter pelo menos um item.'),
});

export type CartSummaryRequest = z.infer<typeof cartSummaryBodySchema>;
