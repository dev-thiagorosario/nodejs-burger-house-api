import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { PostgresOrderStatusRepository } from '../../src/postgres-repository/postgres-order-status-repository.js';

describe('PostgresOrderStatusRepository.findAll', () => {
  it('reads dropdown IDs and names from the database ordered by ID', async () => {
    const statuses = [
      { id: 1, name: 'pending' },
      { id: 2, name: 'pickedUp' },
      { id: 3, name: 'cancelled' },
      { id: 4, name: 'preparing' },
    ];
    const query = vi.fn(async () => ({ rows: statuses }));
    const repository = new PostgresOrderStatusRepository({ query } as unknown as Pool);

    expect(await repository.findAll()).toEqual(statuses);
    expect(query).toHaveBeenCalledExactlyOnceWith(
      'SELECT id, name FROM order_statuses ORDER BY id',
    );
  });

  it('returns an empty list when the table has no statuses', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const repository = new PostgresOrderStatusRepository({ query } as unknown as Pool);

    expect(await repository.findAll()).toEqual([]);
  });

  it('propagates database failures', async () => {
    const error = new Error('database unavailable');
    const query = vi.fn().mockRejectedValue(error);
    const repository = new PostgresOrderStatusRepository({ query } as unknown as Pool);

    await expect(repository.findAll()).rejects.toBe(error);
  });
});
