import type { PoolClient } from 'pg';

export const id = '008-add-is-active-to-products';

export async function up(client: PoolClient): Promise<void> {
  await client.query('ALTER TABLE products ADD COLUMN is_active boolean NOT NULL DEFAULT true');
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('ALTER TABLE products DROP COLUMN IF EXISTS is_active');
}
