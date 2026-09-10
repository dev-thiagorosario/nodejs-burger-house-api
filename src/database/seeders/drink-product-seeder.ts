import 'dotenv/config';

import { createPostgresPool } from '../data-source.js';

const products = [
  {
    id: 'milkshake-morango',
    title: 'Milkshake de Morango',
    description: 'Milkshake cremoso de morango, preparado com leite e sorvete, servido bem gelado.',
    image: '/assets_drinks/imagem1RealSize.jpg',
    mobile_image: '/assets_drinks/imagem1.png',
    image_alt: 'Copo de milkshake rosa com canudo e morangos ao lado',
    price: 16.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'suco-laranja',
    title: 'Suco de Laranja',
    description: 'Suco de laranja refrescante, servido gelado para acompanhar seu lanche.',
    image: '/assets_drinks/imagem2RealSize.jpg',
    mobile_image: '/assets_drinks/imagem(2).png',
    image_alt: 'Copo de suco de laranja com laranjas cortadas ao lado',
    price: 9.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'coca-cola-lata',
    title: 'Coca-Cola Lata',
    description: 'Coca-Cola original em lata, servida bem gelada.',
    image: '/assets_drinks/imagem3RealSiza.jpg',
    mobile_image: '/assets_drinks/imagem(3).png',
    image_alt: 'Lata vermelha de Coca-Cola sobre uma mesa',
    price: 6.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'milkshake-chocolate',
    title: 'Milkshake de Chocolate',
    description: 'Milkshake cremoso de chocolate, preparado com leite e sorvete de chocolate, servido gelado.',
    image: '/assets_drinks/imagem4RealSize.jpg',
    mobile_image: '/assets_drinks/imagem(4).png',
    image_alt: 'Copo de milkshake de chocolate com raspas de chocolate por cima',
    price: 16.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'limonada-suica',
    title: 'Limonada Suíça',
    description: 'Limonada suíça cremosa, preparada com limão e leite condensado, servida bem gelada.',
    image: '/assets_drinks/imagem5RealSize.jpg',
    mobile_image: '/assets_drinks/imagem(5).png',
    image_alt: 'Copo de limonada cremosa com limões inteiros e cortados ao lado',
    price: 11.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'suco-maracuja',
    title: 'Suco de Maracujá',
    description: 'Suco de maracujá com sabor levemente ácido e refrescante, servido gelado.',
    image: '/assets_drinks/imagem6RealSize.jpg',
    mobile_image: '/assets_drinks/imagem(6).png',
    image_alt: 'Copo de suco amarelo com maracujá inteiro e cortado ao lado',
    price: 10.9,
    category: { id: 3, name: 'Bebidas' },
  },
] as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
}

const pool = createPostgresPool(databaseUrl);

async function seedDrinkProducts(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const product of products) {
      await client.query(
        `INSERT INTO product_categories (id, name)
         VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [product.category.id, product.category.name],
      );

      await client.query(
        `INSERT INTO products (
           id, title, description, image, mobile_image, image_alt, price, category_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           image = EXCLUDED.image,
           mobile_image = EXCLUDED.mobile_image,
           image_alt = EXCLUDED.image_alt,
           price = EXCLUDED.price,
           category_id = EXCLUDED.category_id,
           updated_at = now()`,
        [
          product.id,
          product.title,
          product.description,
          product.image,
          product.mobile_image,
          product.image_alt,
          product.price,
          product.category.id,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(`${products.length} bebidas populadas com sucesso.`);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seedDrinkProducts()
  .catch((error: unknown) => {
    console.error('Falha ao popular as bebidas.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
