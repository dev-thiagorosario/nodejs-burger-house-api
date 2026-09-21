import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { InvalidOrderError, Order } from '../../src/entities/order-entity.js';
import { PostgresOrderRepository } from '../../src/postgres-repository/postgres-order-repository.js';
import type { CreateOrderData } from '../../src/repository/i-order-repository.js';

const data: CreateOrderData = {
  userId: 'a9054712-67a5-47e0-9999-8db6be85dcbf',
  items: [
    { productId: 'classic-burger', productName: 'Classic Burger', quantity: 2, unitPrice: 25.9 },
    { productId: 'fries', productName: 'Batata Frita', quantity: 1, unitPrice: 14.9 },
  ],
};
const orderRow = {
  id: 82,
  user_id: data.userId,
  created_at: new Date('2026-09-21T12:00:00Z'),
  updated_at: new Date('2026-09-21T12:00:00Z'),
};
const itemRows = [
  { id: 302, product_id: 'classic-burger', name: 'Classic Burger', quantity: 2, price: '25.90' },
  { id: 310, product_id: 'fries', name: 'Batata Frita', quantity: 1, price: '14.90' },
];

function setup() {
  const query = vi.fn<(sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>()
    .mockResolvedValue({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: 7 }] })
    .mockResolvedValueOnce({ rows: [orderRow] })
    .mockResolvedValueOnce({ rows: [itemRows[0]] })
    .mockResolvedValueOnce({ rows: [itemRows[1]] });
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query, release }));
  const repository = new PostgresOrderRepository({ connect } as unknown as Pool);
  return { query, release, connect, repository };
}

describe('PostgresOrderRepository.create', () => {
  it('creates a pending order and item snapshots atomically using database-generated IDs and timestamps', async () => {
    const { query, release, connect, repository } = setup();

    const result = await repository.create(data);

    expect(result).toBeInstanceOf(Order);
    expect(result.id).toBe(82);
    expect(result.userId).toBe(data.userId);
    expect(result.status).toBe('pending');
    expect(result.createdAt).toEqual(orderRow.created_at);
    expect(result.updatedAt).toEqual(orderRow.updated_at);
    expect(result.items.map(item => ({
      id: item.id, productId: item.productId, productName: item.productName,
      quantity: item.quantity, unitPrice: item.unitPrice,
    }))).toEqual(data.items.map((item, index) => ({ ...item, id: itemRows[index]?.id })));
    expect(result.total).toBe(66.7);
    expect(connect).toHaveBeenCalledOnce();
    expect(query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(query).toHaveBeenNthCalledWith(2,
      'SELECT id FROM order_statuses WHERE name = $1 LIMIT 1', ['pending']);
    expect(query).toHaveBeenNthCalledWith(3,
      expect.stringContaining('INSERT INTO orders (user_id, status_id)'), [data.userId, 7]);
    expect(query).toHaveBeenNthCalledWith(4,
      expect.stringContaining('INSERT INTO order_items (order_id, product_id, name, quantity, price)'),
      [82, 'classic-burger', 'Classic Burger', 2, 25.9]);
    expect(query).toHaveBeenNthCalledWith(5,
      expect.stringContaining('INSERT INTO order_items (order_id, product_id, name, quantity, price)'),
      [82, 'fries', 'Batata Frita', 1, 14.9]);
    expect(query).toHaveBeenLastCalledWith('COMMIT');
    expect(query).not.toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });

  it('rolls back without inserting an order when the pending status is missing', async () => {
    const { query, release, repository } = setup();
    query.mockReset().mockResolvedValue({ rows: [] });

    await expect(repository.create(data)).rejects.toThrow('O status inicial pending não está cadastrado.');

    expect(query).toHaveBeenCalledTimes(3);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('rolls back the order and previous items when inserting a later item fails', async () => {
    const { query, release, repository } = setup();
    const failure = new Error('item insertion failed');
    query.mockReset().mockResolvedValue({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [orderRow] })
      .mockResolvedValueOnce({ rows: [itemRows[0]] })
      .mockRejectedValueOnce(failure);

    await expect(repository.create(data)).rejects.toBe(failure);

    expect(query).toHaveBeenCalledTimes(6);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('validates the persisted aggregate before committing and rolls back invalid persisted items', async () => {
    const { query, release, repository } = setup();
    query.mockReset().mockResolvedValue({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [orderRow] })
      .mockResolvedValueOnce({ rows: [itemRows[0]] })
      .mockResolvedValueOnce({ rows: [{ ...itemRows[1], quantity: 0 }] });

    await expect(repository.create(data)).rejects.toBeInstanceOf(InvalidOrderError);

    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it.each([
    { rows: [], message: 'O banco não retornou o pedido criado.' },
    { rows: [orderRow], message: 'O banco não retornou o item do pedido criado.' },
  ])('rolls back missing RETURNING rows: $message', async ({ rows, message }) => {
    const { query, release, repository } = setup();
    query.mockReset().mockResolvedValue({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows });

    await expect(repository.create(data)).rejects.toThrow(message);

    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('rolls back and releases the connection when committing fails', async () => {
    const { query, release, repository } = setup();
    const failure = new Error('commit failed');
    query.mockRejectedValueOnce(failure);

    await expect(repository.create(data)).rejects.toBe(failure);

    expect(query).toHaveBeenNthCalledWith(6, 'COMMIT');
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });

  it('discards the connection and preserves the original error when rolling back fails', async () => {
    const { query, release, repository } = setup();
    const failure = new Error('rollback failed');
    query.mockReset().mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(failure);

    await expect(repository.create(data)).rejects.toThrow('O status inicial pending não está cadastrado.');

    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
  });
});
