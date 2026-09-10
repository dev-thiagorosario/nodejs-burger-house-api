import type { PoolClient } from 'pg';

export const id = '005-create-product-categories';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE product_categories (
      id smallint PRIMARY KEY,
      name varchar(50) NOT NULL,
      CONSTRAINT product_categories_name_unique UNIQUE (name),
      CONSTRAINT product_categories_name_not_blank CHECK (length(trim(name)) > 0)
    )
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS product_categories');
}
