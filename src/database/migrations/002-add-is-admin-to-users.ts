import type { PoolClient } from "pg";

export const id = '002-add-is-admin-to-users';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE users
    ADD COLUMN is_admin boolean NOT NULL DEFAULT false
    `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS is_admin
  `);
}
