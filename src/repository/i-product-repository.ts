import type { Product } from '../entities/product-entity.js';

export interface IProductReader {
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  findByCategoryId(categoryId: number): Promise<Product[]>;
}

export interface IProductWriter {
  create(product: Product): Promise<Product>;
  update(product: Product): Promise<Product>;
}

export interface IProductRepository extends IProductReader, IProductWriter {}
