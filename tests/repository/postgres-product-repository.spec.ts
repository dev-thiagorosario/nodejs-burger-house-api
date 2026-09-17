import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { Product } from '../../src/entities/product-entity.js';
import { ProductAlreadyExistsError } from '../../src/exception/product-already-exists-error.js';
import { ProductNotFoundError } from '../../src/exception/product-not-found-error.js';
import { PostgresProductRepository } from '../../src/postgres-repository/postgres-product-repository.js';

const row = {
  id: 'classic-burger', title: 'Classic Burger', description: 'Carne e queijo',
  image: '/desktop.png', mobile_image: '/mobile.png', image_alt: 'Foto do burger',
  price: '25.90', category_id: 1, is_active: false,
  created_at: new Date('2026-09-01T12:00:00Z'), updated_at: new Date('2026-09-10T12:00:00Z'),
};
const product = new Product({
  id: row.id, name: row.title, description: row.description,
  imageUrl: row.image, mobileImageUrl: row.mobile_image, imageAlt: row.image_alt,
  price: 25.9, categoryId: row.category_id, isActive: row.is_active,
  createdAt: row.created_at, updatedAt: row.updated_at,
});
function setup(rows = [row]) {
  const query = vi.fn<(sql: string, values?: unknown[]) => Promise<{ rows: Array<Omit<typeof row, 'image_alt'> & { image_alt: string | null }> }>>()
    .mockResolvedValue({ rows });
  return { query, repository: new PostgresProductRepository({ query } as unknown as Pool) };
}

describe('PostgresProductRepository', () => {
  it('maps all columns, numeric strings and inactive state on every read', async () => {
    const { query, repository } = setup();
    expect(await repository.findById(row.id)).toEqual(product);
    expect(await repository.findAll()).toEqual([product]);
    expect(await repository.findByCategoryId(1)).toEqual([product]);
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('WHERE id = $1'), [row.id]);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('ORDER BY id'));
    expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining('WHERE category_id = $1'), [1]);
  });

  it('returns null or empty arrays when no rows match', async () => {
    const { repository } = setup([]);
    expect(await repository.findById('missing')).toBeNull();
    expect(await repository.findAll()).toEqual([]);
    expect(await repository.findByCategoryId(2)).toEqual([]);
  });

  it('uses the domain fallback for nullable alternative text', async () => {
    const { query, repository } = setup();
    query.mockResolvedValue({ rows: [{ ...row, image_alt: null }] });
    expect((await repository.findById(row.id))?.imageAlt).toBe(row.title);
  });

  it('inserts every field and returns the persisted product', async () => {
    const { query, repository } = setup();
    expect(await repository.create(product)).toEqual(product);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO products'), [
      row.id, row.title, row.description, row.image, row.mobile_image, row.image_alt,
      25.9, row.category_id, false, row.created_at, row.updated_at,
    ]);
  });

  it('persists deactivation with UPDATE, preserving the creation timestamp', async () => {
    const { query, repository } = setup();
    expect(await repository.update(product)).toEqual(product);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE products SET'), [
      row.id, row.title, row.description, row.image, row.mobile_image, row.image_alt,
      25.9, row.category_id, false, row.updated_at,
    ]);
    const sql = query.mock.calls[0]?.[0];
    expect(sql).toContain('is_active = $9');
    expect(sql).toContain('WHERE id = $1');
    expect(sql).not.toContain('created_at =');
    expect(sql).not.toContain('DELETE');
  });

  it('handles missing RETURNING rows for create and update', async () => {
    const { repository } = setup([]);
    await expect(repository.create(product)).rejects.toThrow('O banco não retornou o produto criado.');
    await expect(repository.update(product)).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it('translates concurrent duplicate IDs into the same application error', async () => {
    const { query, repository } = setup();
    query.mockRejectedValue({ code: '23505', constraint: 'products_pkey' });
    await expect(repository.create(product)).rejects.toBeInstanceOf(ProductAlreadyExistsError);
  });

  it.each([new Error('database unavailable'), { code: '23505', constraint: 'other_unique' }, { code: '23503' }])('preserves unrelated database errors (%j)', async (error) => {
    const { query, repository } = setup();
    query.mockRejectedValue(error);
    await expect(repository.create(product)).rejects.toBe(error);
    await expect(repository.update(product)).rejects.toBe(error);
    await expect(repository.findById(row.id)).rejects.toBe(error);
    await expect(repository.findAll()).rejects.toBe(error);
    await expect(repository.findByCategoryId(1)).rejects.toBe(error);
  });
});
