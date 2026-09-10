import 'dotenv/config';

import { createPostgresPool } from '../data-source.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
}

const pool = createPostgresPool(databaseUrl);

async function seedOrderStatuses(): Promise<void> {
  await pool.query(
    `
      INSERT INTO order_statuses (id, name)
      VALUES ($1, $2), ($3, $4), ($5, $6)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name
    `,
    [1, 'Pendente', 2, 'Retirado', 3, 'Cancelado'],
  );

  console.log('Status dos pedidos populados com sucesso.');
}

seedOrderStatuses()
  .catch((error: unknown) => {
    console.error('Falha ao popular os status dos pedidos.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
