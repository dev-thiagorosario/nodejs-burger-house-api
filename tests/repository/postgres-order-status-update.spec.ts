import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresOrderRepository } from '../../src/postgres-repository/postgres-order-repository.js';
import { InvalidOrderError } from '../../src/entities/order-entity.js';
import { OrderNotFoundError } from '../../src/exception/order-not-found-error.js';
import { InvalidOrderStatusError } from '../../src/value-object/order-status-value-object.js';

const row = {
  id: 42, user_id: '11111111-1111-4111-8111-111111111111', full_name: 'Cliente Teste',
  created_at: new Date('2026-09-01T12:00:00Z'), updated_at: new Date('2026-09-02T12:00:00Z'),
  picked_up_at: null as Date | null, status: 'pending',
  item_id: 10 as number | null, product_id: 'burger', name: 'Burger histórico', quantity: 2, price: '25.90',
};

function setup(target = 'pickedUp', changes: Partial<typeof row> = {}) {
  const query = vi.fn().mockResolvedValue({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: 42 }] })
    .mockResolvedValueOnce({ rows: [{ name: target }] })
    .mockResolvedValueOnce({ rows: [{ ...row, ...changes }] });
  const release = vi.fn();
  const repository = new PostgresOrderRepository({ connect: async () => ({ query, release }) } as unknown as Pool);
  return { query, release, repository };
}

describe('PostgresOrderRepository.updateStatus', () => {
  it('locks the order before reading and persists the pickup time and the selected database status ID', async () => {
    const { repository, query, release } = setup();
    const result = await repository.updateStatus(42, 17);
    expect(result.order.status).toBe('pickedUp');
    expect(result.order.pickedUpAt).toBeInstanceOf(Date);
    expect(result.order.pickedUpAt).toEqual(result.order.updatedAt);
    expect(result.user).toEqual({ id: row.user_id, fullName: 'Cliente Teste' });
    expect(result.order.total).toBe(51.8);
    expect(query).toHaveBeenNthCalledWith(2, 'SELECT id FROM orders WHERE id = $1 FOR UPDATE', [42]);
    expect(query).toHaveBeenNthCalledWith(3, 'SELECT name FROM order_statuses WHERE id = $1', [17]);
    expect(query).toHaveBeenNthCalledWith(5, expect.stringContaining('UPDATE orders SET'),
      [42, 17, result.order.pickedUpAt, result.order.updatedAt]);
    expect(query).toHaveBeenLastCalledWith('COMMIT');
    expect(release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('cancels without setting a pickup time', async () => {
    const { repository, query } = setup('cancelled');
    const result = await repository.updateStatus(42, 8);
    expect(result.order.status).toBe('cancelled');
    expect(result.order.pickedUpAt).toBeNull();
    expect(query).toHaveBeenNthCalledWith(5, expect.stringContaining('UPDATE orders SET'), [42, 8, null, result.order.updatedAt]);
  });

  it('preserves the original pickup time when retrying a completed update', async () => {
    const pickedUpAt = new Date('2026-09-01T15:00:00Z');
    const { repository, query } = setup('pickedUp', { status: 'pickedUp', picked_up_at: pickedUpAt });
    const result = await repository.updateStatus(42, 17);
    expect(result.order.pickedUpAt).toEqual(pickedUpAt);
    expect(result.order.updatedAt).toEqual(row.updated_at);
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE orders'))).toBe(false);
    expect(query).toHaveBeenLastCalledWith('COMMIT');
  });

  it.each([
    ['cancelled', 'pickedUp'], ['pickedUp', 'cancelled'], ['pending', 'cancelled'],
  ])('rejects transition to %s from %s', async (target, status) => {
    const { repository, query, release } = setup(target, { status });
    await expect(repository.updateStatus(42, 17)).rejects.toBeInstanceOf(InvalidOrderError);
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE orders'))).toBe(false);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('does not allow pickup of an empty order', async () => {
    const { repository, query } = setup('pickedUp', { item_id: null });
    await expect(repository.updateStatus(42, 17)).rejects.toBeInstanceOf(InvalidOrderError);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it('reports a missing order and rolls back', async () => {
    const { repository, query } = setup();
    query.mockReset().mockResolvedValue({ rows: [] });
    await expect(repository.updateStatus(42, 17)).rejects.toBeInstanceOf(OrderNotFoundError);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it('rejects a missing status without updating the order', async () => {
    const { repository, query } = setup();
    query.mockReset().mockResolvedValue({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 42 }] });
    await expect(repository.updateStatus(42, 17)).rejects.toBeInstanceOf(InvalidOrderStatusError);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it('rolls back an update failure and releases the connection', async () => {
    const { repository, query, release } = setup();
    const error = new Error('write failed');
    query.mockRejectedValueOnce(error);
    await expect(repository.updateStatus(42, 17)).rejects.toBe(error);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledExactlyOnceWith(false);
  });
});
