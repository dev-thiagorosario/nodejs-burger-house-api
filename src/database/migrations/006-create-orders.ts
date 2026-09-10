import type { PoolClient } from 'pg';

export const id = '006-create-orders';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE orders (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users (id),
      status_id smallint NOT NULL REFERENCES order_statuses (id),
      ordered_at timestamptz NOT NULL DEFAULT now(),
      picked_up_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT orders_pickup_after_order CHECK (picked_up_at >= ordered_at)
    )
  `);

  await client.query('CREATE INDEX orders_user_id_index ON orders (user_id)');
  await client.query('CREATE INDEX orders_status_id_index ON orders (status_id)');
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS orders');
}
