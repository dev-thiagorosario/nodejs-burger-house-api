import type { PoolClient } from 'pg';

export const id = '007-create-order-items';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE order_items (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id integer NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
      product_id varchar(255) NOT NULL REFERENCES products (id),
      name varchar(255) NOT NULL,
      quantity integer NOT NULL,
      price numeric(10, 2) NOT NULL,
      CONSTRAINT order_items_name_not_blank CHECK (length(trim(name)) > 0),
      CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
      CONSTRAINT order_items_price_non_negative CHECK (price >= 0 AND price <> 'NaN'::numeric),
      CONSTRAINT order_items_order_product_unique UNIQUE (order_id, product_id)
    )
  `);

  await client.query('CREATE INDEX order_items_product_id_index ON order_items (product_id)');
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS order_items');
}
