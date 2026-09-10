import type { PoolClient } from "pg";

export const id = '003-create-order-statuses';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE order_statuses (
      id smallint PRIMARY KEY,
      name varchar(50) NOT NULL,
      CONSTRAINT order_statuses_name_unique UNIQUE (name),
      CONSTRAINT order_statuses_name_not_blank CHECK (length(trim(name)) > 0)
    )
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS order_statuses');
}
