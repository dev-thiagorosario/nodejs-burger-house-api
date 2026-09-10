import 'dotenv/config';

import { createPostgresPool } from '../data-source.js';

const products = [
  {
    id: 'classic-burger',
    title: 'Classic Burger',
    description:
      'Hambúrguer bovino artesanal, queijo derretido, alface, tomate, cebola roxa, picles e molho da casa no pão de brioche tostado.',
    image: '/assets/imagem1TRealSize.jpg',
    mobile_image: '/assets/imagem1.png',
    image_alt: 'Classic Burger com carne bovina, queijo, alface, tomate e molho da casa',
    price: 25.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'duplo-bacon',
    title: 'Duplo Bacon',
    description:
      'Dois hambúrgueres bovinos artesanais, queijo cheddar, bacon crocante, cebola roxa e molho especial no pão com gergelim.',
    image: '/assets/imagem2RealSize.jpg',
    mobile_image: '/assets/imagem(2).png',
    image_alt: 'Duplo Bacon com duas carnes, cheddar, bacon e cebola roxa',
    price: 36.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'cheeseburger-salada',
    title: 'Cheeseburger Salada',
    description:
      'Hambúrguer bovino artesanal, queijo cheddar derretido, alface, tomate, cebola e maionese da casa no pão com gergelim.',
    image: '/assets/imagem3RealSize.jpg',
    mobile_image: '/assets/imagem(3).png',
    image_alt: 'Cheeseburger Salada com carne bovina, cheddar, alface, tomate e cebola',
    price: 28.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'veggie-burger',
    title: 'Veggie Burger',
    description:
      'Hambúrguer vegetal artesanal, queijo cheddar derretido, alface, tomate, cebola roxa, picles e molho especial da casa, no pão de brioche tostado.',
    image: '/assets/imagem4RealSize.jpg',
    mobile_image: '/assets/imagem(4).png',
    image_alt:
      'Veggie Burger com hambúrguer vegetal, queijo cheddar, alface, tomate, cebola roxa e picles',
    price: 27.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'chicken-burger',
    title: 'Chicken Burger',
    description:
      'Filé de frango empanado crocante, queijo cheddar derretido, alface, tomate, picles e maionese da casa, no pão de brioche tostado.',
    image: '/assets/Imagem5RealSize.jpg',
    mobile_image: '/assets/imagem(5).png',
    image_alt:
      'Chicken Burger com frango empanado crocante, queijo cheddar, alface, tomate e picles',
    price: 29.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'fish-burger-duplo',
    title: 'Fish Burger Duplo',
    description:
      'Dois filés de peixe empanado crocante, queijo cheddar derretido, alface, tomate, picles e molho tártaro, no pão de brioche tostado.',
    image: '/assets/imagem6RealSize.jpg',
    mobile_image: '/assets/imagem(6).png',
    image_alt:
      'Fish Burger Duplo com dois filés de peixe empanado, queijo cheddar, alface, tomate e picles',
    price: 34.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'bacon-bbq',
    title: 'Bacon BBQ',
    description:
      'Hambúrguer bovino, queijo cheddar derretido, bacon crocante, cebola caramelizada e molho barbecue, no pão de brioche tostado.',
    image: '/assets/Imagem7RealSize.jpg',
    mobile_image: '/assets/imagem(7).png',
    image_alt:
      'Bacon BBQ com hambúrguer bovino, queijo cheddar, bacon crocante, cebola caramelizada e molho barbecue',
    price: 32.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'super-cheddar-bacon',
    title: 'Super Cheddar Bacon',
    description:
      'Dois suculentos hambúrgueres bovinos, muito queijo cheddar cremoso, bastante bacon crocante e molho especial da casa, no pão de brioche tostado.',
    image: '/assets/Imagem8RealSize.jpg',
    mobile_image: '/assets/imagem(8).png',
    image_alt:
      'Super Cheddar Bacon com duas carnes, muito queijo cheddar cremoso e bacon crocante',
    price: 39.9,
    category: { id: 1, name: 'Hamburguer' },
  },
] as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
}

const pool = createPostgresPool(databaseUrl);

async function seedBurguerProducts(): Promise<void> {
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
    console.log(`${products.length} hambúrgueres populados com sucesso.`);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seedBurguerProducts()
  .catch((error: unknown) => {
    console.error('Falha ao popular os hambúrgueres.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
