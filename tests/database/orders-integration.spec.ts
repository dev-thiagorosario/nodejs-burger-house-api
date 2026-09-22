import cookieParser from 'cookie-parser';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as migration0 from '../../src/database/migrations/001-create-users.js';
import * as migration1 from '../../src/database/migrations/002-add-is-admin-to-users.js';
import * as migration2 from '../../src/database/migrations/003-create-order-statuses.js';
import * as migration3 from '../../src/database/migrations/005-create-product-categories.js';
import * as migration4 from '../../src/database/migrations/004-create-products.js';
import * as migration5 from '../../src/database/migrations/006-create-orders.js';
import * as migration6 from '../../src/database/migrations/007-create-order-items.js';
import * as migration7 from '../../src/database/migrations/008-add-is-active-to-products.js';
import * as migration8 from '../../src/database/migrations/009-create-product-images.js';
import * as migration9 from '../../src/database/migrations/010-remove-product-image-columns.js';
import { ListOrdersController } from '../../src/Http/controller/order/list-orders-controller.js';
import { AUTH_COOKIE_NAME } from '../../src/Http/helper/auth-cookie.js';
import { AuthMiddleware } from '../../src/Http/middleware/auth-middleware.js';
import { PostgresOrderRepository } from '../../src/postgres-repository/postgres-order-repository.js';
import { PostgresUserRepository } from '../../src/postgres-repository/postgres-user-repository.js';
import { JwtTokenProvider } from '../../src/providers/jwt-token-provider.js';
import { ListOrdersUseCase } from '../../src/use-case/order/list-orders-use-case.js';

const connectionString = process.env.TEST_DATABASE_URL;
const migrations = [migration0, migration1, migration2, migration3, migration4, migration5, migration6, migration7, migration8, migration9];
const statuses = [
  { filter: 'pending', name: 'pending', id: 7 },
  { filter: 'withdrawn', name: 'pickedUp', id: 17 },
  { filter: 'cancelled', name: 'cancelled', id: 29 },
] as const;
const customers = [randomUUID(), randomUUID()];
const adminId = randomUUID();
const emptyCustomerId = randomUUID();
const createdAt = '2026-09-01T12:00:00.000Z';
const updatedAt = '2026-09-01T12:30:00.000Z';
const tokens = new JwtTokenProvider('orders-integration-test-secret');

describe.skipIf(!connectionString)('GET /orders PostgreSQL integration', () => {
  let pool: Pool;
  let admin: Pool;
  let schema: string;
  let app: express.Express;

  beforeAll(async () => {
    // The suite owns only its random schema, never public/application tables.
    schema = `orders_test_${randomUUID().replaceAll('-', '')}`;
    admin = new Pool({ connectionString });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const migration of migrations) await migration.up(client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    for (const userId of [...customers, adminId, emptyCustomerId]) {
      await pool.query(`INSERT INTO users (id, full_name, email, password_hash, cep, is_admin)
        VALUES ($1, 'Cliente Teste', $2, 'test-hash', '40000-000', $3)`,
      [userId, `${userId}@example.com`, userId === adminId]);
    }
    await pool.query("INSERT INTO product_categories (id, name) VALUES (1, 'Hamburguer')");
    await pool.query(`INSERT INTO products (id, title, description, price, category_id)
      VALUES ('burger', 'Nome atual do produto', '', 35, 1), ('drink', 'Bebida', '', 12, 1)`);
    for (const status of statuses) {
      // Deliberately different from seeded IDs to exercise lookup by status name.
      await pool.query('INSERT INTO order_statuses (id, name) VALUES ($1, $2)', [status.id, status.name]);
      for (const userId of customers) {
        const result = await pool.query<{ id: number }>(
          `INSERT INTO orders (user_id, status_id, ordered_at, created_at, updated_at, picked_up_at)
           VALUES ($1, $2, $3, $3, $4, $5) RETURNING id`,
          [userId, status.id, createdAt, updatedAt, status.name === 'pickedUp' ? updatedAt : null],
        );
        await pool.query(`INSERT INTO order_items (order_id, product_id, name, quantity, price)
          VALUES ($1, 'burger', 'Duplo da Casa', 2, 29.90), ($1, 'drink', 'Bebida original', 1, 10.00)`,
        [result.rows[0]!.id]);
      }
    }

    const controller = new ListOrdersController(new ListOrdersUseCase(
      new PostgresOrderRepository(pool), new PostgresUserRepository(pool),
    ));
    app = express();
    app.use(cookieParser());
    app.get('/orders', new AuthMiddleware(tokens).handle, controller.handle);
  });

  afterAll(async () => {
    await pool?.end();
    try {
      if (schema) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    } finally {
      await admin?.end();
    }
  });

  function list(userId: string, query: Record<string, string> = {}) {
    return request(app).get('/orders').query(query)
      .set('Cookie', `${AUTH_COOKIE_NAME}=${tokens.generate(userId)}`);
  }

  it.each(customers)('returns every status only for authenticated customer %s', async (userId) => {
    const response = await list(userId);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.orders).toHaveLength(3);
    expect(response.body.data.orders).toEqual(statuses.toReversed().map((status) => expect.objectContaining({
      userId, status: status.name,
    })));
  });

  it('returns all customers and all statuses for administrators', async () => {
    const response = await list(adminId);
    expect(response.status).toBe(200);
    expect(response.body.data.orders).toHaveLength(6);
    for (const userId of customers) {
      for (const status of statuses) {
        expect(response.body.data.orders).toContainEqual(expect.objectContaining({ userId, status: status.name }));
      }
    }
  });

  it.each(statuses)('filters customer orders by $filter using the actual PostgreSQL status relation', async (status) => {
    for (const userId of customers) {
      const response = await list(userId, { status: status.filter });
      expect(response.status).toBe(200);
      expect(response.body.data.orders).toEqual([expect.objectContaining({ userId, status: status.name })]);
    }
  });

  it.each(statuses)('filters administrator orders by $filter across customers', async (status) => {
    const response = await list(adminId, { status: status.filter });
    expect(response.status).toBe(200);
    expect(response.body.data.orders).toEqual([...customers].reverse().map((userId) => expect.objectContaining({
      userId, status: status.name,
    })));
  });

  it('returns item snapshots, numeric totals and timestamps without user credentials', async () => {
    const response = await list(customers[0]!, { status: 'withdrawn' });
    expect(response.status).toBe(200);
    expect(response.body.data.orders).toEqual([{
      id: expect.any(Number), userId: customers[0], status: 'pickedUp',
      items: [
        { id: expect.any(Number), productId: 'burger', name: 'Duplo da Casa', quantity: 2, unitPrice: 29.9, subtotal: 59.8 },
        { id: expect.any(Number), productId: 'drink', name: 'Bebida original', quantity: 1, unitPrice: 10, subtotal: 10 },
      ],
      totalItems: 3, total: 69.8, createdAt, updatedAt, pickedUpAt: updatedAt,
      user: { id: customers[0], fullName: 'Cliente Teste' },
    }]);
  });

  it.each([{}, { status: 'pending' }])('returns an empty list when the customer has no matching orders: %j', async (query) => {
    const response = await list(emptyCustomerId, query);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { orders: [] } });
  });

  it('rejects arbitrary userId query parameters', async () => {
    const response = await list(customers[0]!, { userId: customers[1]! });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, message: 'Verifique os dados informados.' });
    expect(response.body.data).toBeUndefined();
  });

  it('rejects an invalid status with the validation response', async () => {
    const response = await list(customers[0]!, { status: 'invalid' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Verifique os dados informados.',
      errors: [{ field: 'status', message: 'O status deve ser pending, withdrawn ou cancelled.' }],
    });
  });

  it('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/orders');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: 'Não autenticado.' });
  });
});
