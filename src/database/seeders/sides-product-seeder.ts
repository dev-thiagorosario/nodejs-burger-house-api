import 'dotenv/config';

import { createPostgresPool } from '../data-source.js';

const products = [
  {
    id: 'batata-frita',
    title: 'Batata Frita',
    description: 'Porção de batatas fritas douradas, crocantes por fora e macias por dentro, finalizadas com sal e ervas.',
    image: '/assets_sides/imagem1RealSize.jpg',
    mobile_image: '/assets_sides/imagem1.png',
    image_alt: 'Porção de batatas fritas douradas com ervas sobre uma superfície escura',
    price: 18.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'polenta-frita',
    title: 'Polenta Frita',
    description: 'Palitos de polenta frita, dourados por fora e macios por dentro, ideais para compartilhar.',
    image: '/assets_sides/imagem2RealSize.jpg',
    mobile_image: '/assets_sides/imagem(2).png',
    image_alt: 'Palitos dourados de polenta frita em uma travessa de vidro',
    price: 19.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'calabresa-fatiada',
    title: 'Calabresa Fatiada',
    description: 'Porção de linguiça calabresa em rodelas, com sabor marcante e levemente defumado.',
    image: '/assets_sides/imagem3RealSiza.jpg',
    mobile_image: '/assets_sides/imagem(3).png',
    image_alt: 'Linguiça calabresa cortada em rodelas sobre uma tábua de madeira',
    price: 24.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'queijo-coalho-grelhado',
    title: 'Queijo Coalho Grelhado',
    description: 'Palitos de queijo coalho grelhados até dourar, acompanhados de molho da casa.',
    image: '/assets_sides/imagem4RealSize.jpg',
    mobile_image: '/assets_sides/imagem(4).png',
    image_alt: 'Palitos de queijo grelhado dourado em uma tigela com molho ao lado',
    price: 26.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'nuggets-frango',
    title: 'Nuggets de Frango',
    description: 'Porção de nuggets de frango empanados e crocantes, acompanhados de molho de mostarda.',
    image: '/assets_sides/imagem5RealSize.jpg',
    mobile_image: '/assets_sides/imagem(5).png',
    image_alt: 'Nuggets de frango dourados em uma tigela com molho de mostarda ao lado',
    price: 22.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'aneis-cebola',
    title: 'Anéis de Cebola',
    description: 'Anéis de cebola empanados, dourados e crocantes, acompanhados de molho da casa.',
    image: '/assets_sides/imagem(6).png',
    mobile_image: '/assets_sides/imagem(6).png',
    image_alt: 'Anéis de cebola empanados em uma tigela com molho ao lado',
    price: 21.9,
    category: { id: 2, name: 'Porcoes' },
  },
] as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
}

const pool = createPostgresPool(databaseUrl);

async function seedSidesProducts(): Promise<void> {
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
    console.log(`${products.length} porções populadas com sucesso.`);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seedSidesProducts()
  .catch((error: unknown) => {
    console.error('Falha ao popular as porções.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
