import type { Pool } from 'pg';

import { Product } from '../entities/product-entity.js';
import { ProductAlreadyExistsError } from '../exception/product-already-exists-error.js';
import { ProductNotFoundError } from '../exception/product-not-found-error.js';
import type { IProductRepository } from '../repository/i-product-repository.js';

interface ProductRow {
  id: string;
  title: string;
  description: string;
  image: string;
  mobile_image: string;
  image_alt: string | null;
  price: string;
  category_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const columns = 'id, title, description, image, mobile_image, image_alt, price, category_id, is_active, created_at, updated_at';

function toProduct(row: ProductRow): Product {
  return new Product({
    id: row.id,
    name: row.title,
    description: row.description,
    imageUrl: row.image,
    mobileImageUrl: row.mobile_image,
    imageAlt: row.image_alt ?? '',
    price: Number(row.price),
    categoryId: row.category_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class PostgresProductRepository implements IProductRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>(
      `SELECT ${columns} FROM products WHERE id = $1 LIMIT 1`, [id],
    );
    const row = result.rows[0];
    return row ? toProduct(row) : null;
  }

  async findAll(): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(
      `SELECT ${columns} FROM products ORDER BY id`,
    );
    return result.rows.map(toProduct);
  }

  async findByCategoryId(categoryId: number): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(
      `SELECT ${columns} FROM products WHERE category_id = $1 ORDER BY id`, [categoryId],
    );
    return result.rows.map(toProduct);
  }

  async create(product: Product): Promise<Product> {
    try {
      const result = await this.pool.query<ProductRow>(
        `INSERT INTO products (${columns})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${columns}`,
        [product.id, product.name, product.description, product.imageUrl,
          product.mobileImageUrl, product.imageAlt, product.price, product.categoryId,
          product.isActive, product.createdAt, product.updatedAt],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error('O banco não retornou o produto criado.');
      }
      return toProduct(row);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null) {
        const databaseError = error as { code?: unknown; constraint?: unknown };
        if (databaseError.code === '23505' && databaseError.constraint === 'products_pkey') {
          throw new ProductAlreadyExistsError();
        }
      }
      throw error;
    }
  }

  async update(product: Product): Promise<Product> {
    const result = await this.pool.query<ProductRow>(
      `UPDATE products SET title = $2, description = $3, image = $4,
         mobile_image = $5, image_alt = $6, price = $7, category_id = $8,
         is_active = $9, updated_at = $10
       WHERE id = $1 RETURNING ${columns}`,
      [product.id, product.name, product.description, product.imageUrl,
        product.mobileImageUrl, product.imageAlt, product.price, product.categoryId,
        product.isActive, product.updatedAt],
    );
    const row = result.rows[0];
    if (!row) {
      throw new ProductNotFoundError();
    }
    return toProduct(row);
  }
}
