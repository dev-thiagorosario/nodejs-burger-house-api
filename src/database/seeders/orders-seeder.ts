import 'dotenv/config';

import { createPostgresPool } from '../data-source.js';

const orders = [
  { status: 'pending', orderedAt: '2026-09-10T18:00:00-03:00', pickedUpAt: null,
    items: [{ productId: 'classic-burger', quantity: 2 }, { productId: 'duplo-bacon', quantity: 1 }] },
  { status: 'pickedUp', orderedAt: '2026-09-10T18:10:00-03:00', pickedUpAt: '2026-09-10T18:35:00-03:00',
    items: [{ productId: 'cheeseburger-salada', quantity: 1 }] },
  { status: 'cancelled', orderedAt: '2026-09-10T18:20:00-03:00', pickedUpAt: null,
    items: [{ productId: 'veggie-burger', quantity: 2 }] },
  { status: 'pending', orderedAt: '2026-09-10T18:30:00-03:00', pickedUpAt: null,
    items: [{ productId: 'chicken-burger', quantity: 1 }, { productId: 'bacon-bbq', quantity: 2 }] },
  { status: 'pickedUp', orderedAt: '2026-09-10T18:40:00-03:00', pickedUpAt: '2026-09-10T19:05:00-03:00',
    items: [{ productId: 'fish-burger-duplo', quantity: 1 }, { productId: 'super-cheddar-bacon', quantity: 1 }] },
] as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
}

const pool = createPostgresPool(databaseUrl);

async function seedOrders(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const userResult = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1', ['thiago@email.com'],
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new Error('Execute npm run db:seed antes de popular os pedidos.');
    }

    for (const order of orders) {
      const statusResult = await client.query<{ id: number }>(
        'SELECT id FROM order_statuses WHERE name = $1', [order.status],
      );
      const status = statusResult.rows[0];
      if (!status) {
        throw new Error('Execute npm run db:seed:order-statuses antes de popular os pedidos.');
      }

      const result = await client.query<{ id: number }>(
        `INSERT INTO orders (user_id, status_id, ordered_at, picked_up_at)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [user.id, status.id, order.orderedAt, order.pickedUpAt],
      );
      const orderId = result.rows[0]!.id;

      for (const item of order.items) {
        const inserted = await client.query(
          `INSERT INTO order_items (order_id, product_id, name, quantity, price)
           SELECT $1, id, title, $2, price FROM products WHERE id = $3`,
          [orderId, item.quantity, item.productId],
        );
        if (inserted.rowCount !== 1) {
          throw new Error(`Produto ${item.productId} não encontrado. Execute npm run db:seed:burguer-products.`);
        }
      }
    }

    await client.query('COMMIT');
    console.log(`${orders.length} pedidos criados com sucesso.`);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seedOrders()
  .catch((error: unknown) => {
    console.error('Falha ao popular os pedidos.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
