import { z } from 'zod';

export const productIdSchema = z.string('Informe o identificador do produto.')
  .trim().min(1).max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'O identificador deve estar em kebab-case.');

export const productFields = {
  name: z.string('Informe o nome do produto.').trim().min(1)
    .refine((name) => [...name].length <= 255, 'O nome deve ter no máximo 255 caracteres.'),
  description: z.string('Informe a descrição do produto.'),
  price: z.number('Informe um preço numérico.').min(0).max(99_999_999.99)
    .refine((price) => Math.round(price * 100) / 100 === price, 'O preço deve ter no máximo duas casas decimais.'),
  categoryId: z.union([z.literal(1), z.literal(2), z.literal(3)], {
    error: 'A categoria deve ser Hamburguer (1), Porcoes (2) ou Bebidas (3).',
  }),
  imageAlt: z.string().trim(),
  isActive: z.boolean('O campo isActive deve ser um booleano.'),
};
