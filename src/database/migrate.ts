import 'dotenv/config';

import type { PoolClient } from 'pg';

import { databaseUrl } from '../core/config.js';
import { createPostgresPool } from './data-source.js';
import * as createUsers from './migrations/001-create-users.js';
import * as addIsAdminToUsers from './migrations/002-add-is-admin-to-users.js';
import * as createOrderStatuses from './migrations/003-create-order-statuses.js';
import * as createProducts from './migrations/004-create-products.js';
import * as createProductCategories from './migrations/005-create-product-categories.js';
import * as createOrders from './migrations/006-create-orders.js';
import * as createOrderItems from './migrations/007-create-order-items.js';

interface Migration {
  id: string;
  up(client: PoolClient): Promise<void>;
}

const migrations: Migration[] = [
  createUsers,
  addIsAdminToUsers,
  createOrderStatuses,
  // Categories must exist before products because of the foreign key.
  createProductCategories,
  createProducts,
  createOrders,
  createOrderItems,
];
const pool = createPostgresPool(databaseUrl);

async function migrate(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id varchar(255) PRIMARY KEY,
        executed_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const appliedResult = await client.query<{ id: string }>(
      'SELECT id FROM schema_migrations',
    );
    const applied = new Set(appliedResult.rows.map((row) => row.id));

    for (const migration of migrations) {
      if (applied.has(migration.id)) {
        continue;
      }

      await client.query('BEGIN');

      try {
        await migration.up(client);
        await client.query(
          'INSERT INTO schema_migrations (id) VALUES ($1)',
          [migration.id],
        );
        await client.query('COMMIT');
        console.log(`Migration executada: ${migration.id}`);
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error('Falha ao executar migrations.', error);
  process.exitCode = 1;
});
