import type { Pool } from 'pg';

import type { IOrderStatusRepository, OrderStatusOption } from '../repository/i-order-status-repository.js';

export class PostgresOrderStatusRepository implements IOrderStatusRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<OrderStatusOption[]> {
    const result = await this.pool.query<OrderStatusOption>(
      'SELECT id, name FROM order_statuses ORDER BY id',
    );
    return result.rows;
  }
}
