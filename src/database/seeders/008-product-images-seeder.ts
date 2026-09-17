import 'dotenv/config';
import { createPostgresPool } from '../data-source.js';
import { importProductImage } from '../product-image-import.js';
import { productSeeds } from '../product-seed-data.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
const pool = createPostgresPool(databaseUrl);

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const product of productSeeds) {
      const existing = await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [product.id]);
      if (!existing.rows.length) continue;
      await importProductImage(client, product.id, 'desktop', product.desktopSource);
      await importProductImage(client, product.id, 'mobile', product.mobileSource);
    }
    await client.query('COMMIT');
    console.log('Imagens de exemplo importadas; uploads existentes preservados.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
seed().catch((error: unknown) => {
  console.error('Falha ao importar imagens.', error);
  process.exitCode = 1;
}).finally(async () => { await pool.end(); });
