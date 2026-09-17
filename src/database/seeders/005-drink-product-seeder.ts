import 'dotenv/config';

import { createPostgresPool } from '../data-source.js';

import { drinkProducts as products } from '../product-seed-data.js';
import { importProductImage } from '../product-image-import.js';

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
           id, title, description, image_alt, price, category_id
         ) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           image_alt = EXCLUDED.image_alt,
           price = EXCLUDED.price,
           category_id = EXCLUDED.category_id,
           updated_at = now()`,
        [
          product.id,
          product.title,
          product.description,
          product.image_alt,
          product.price,
          product.category.id,
        ],
      );
      await importProductImage(client, product.id, 'desktop', product.desktopSource);
      await importProductImage(client, product.id, 'mobile', product.mobileSource);
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
