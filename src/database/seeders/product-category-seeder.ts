import 'dotenv/config';

import { createPostgresPool } from '../data-source.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
}

const pool = createPostgresPool(databaseUrl);

async function seedProductCategories(): Promise<void> {
  await pool.query(
    `
      INSERT INTO product_categories (id, name)
      VALUES ($1, $2), ($3, $4), ($5, $6)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name
    `,
    [1, 'Hamburguer', 2, 'Porcoes', 3, 'Bebidas'],
  );

  console.log('Categorias dos produtos populadas com sucesso.');
}

seedProductCategories()
  .catch((error: unknown) => {
    console.error('Falha ao popular as categorias dos produtos.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
