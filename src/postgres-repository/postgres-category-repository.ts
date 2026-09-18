import type { Pool } from 'pg';

import type { Category, ICategoryRepository } from '../repository/i-category-repository.js';

export class PostgresCategoryRepository implements ICategoryRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<Category[]> {
    const result = await this.pool.query<Category>(
      'SELECT id, name FROM product_categories ORDER BY id',
    );
    return result.rows;
  }
}
