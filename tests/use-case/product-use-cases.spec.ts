import { afterEach, describe, expect, it, vi } from 'vitest';
import { Product, InvalidProductError } from '../../src/entities/product-entity.js';
import { ProductAlreadyExistsError } from '../../src/exception/product-already-exists-error.js';
import { ProductNotFoundError } from '../../src/exception/product-not-found-error.js';
import type { IProductRepository } from '../../src/repository/i-product-repository.js';
import { CreateProductUseCase } from '../../src/use-case/product/create-product-use-case.js';
import { GetProductByIdUseCase } from '../../src/use-case/product/get-product-by-id-use-case.js';
import { ListProductsUseCase } from '../../src/use-case/product/list-products-use-case.js';
import { UpdateProductUseCase } from '../../src/use-case/product/update-product-use-case.js';
import { DeleteProductUseCase } from '../../src/use-case/product/delete-product-use-case.js';
import { InvalidProductCategoryError } from '../../src/value-object/product-category-value-object.js';

const input = {
  id: 'classic-burger', name: 'Classic Burger', description: 'Carne e queijo',
  price: 25.9, categoryId: 1, imageUrl: '/desktop.png', mobileImageUrl: '/mobile.png',
};
const date = new Date('2026-09-01T12:00:00Z');
function product() {
  return new Product({ ...input, createdAt: date, updatedAt: date });
}
function repository(found: Product | null = null) {
  return {
    findById: vi.fn(async () => found),
    findAll: vi.fn(async () => found ? [found] : []),
    findByCategoryId: vi.fn(async () => found ? [found] : []),
    create: vi.fn(async (value: Product) => value),
    update: vi.fn(async (value: Product) => value),
  } satisfies IProductRepository;
}
afterEach(() => vi.useRealTimers());

describe('Product use cases', () => {
  it('creates a normalized product with application timestamps and a plain output', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(date);
    const repo = repository();
    const result = await new CreateProductUseCase(repo).execute({ ...input, id: ' classic-burger ' });
    expect(result).toEqual({ ...input, imageAlt: input.name, isActive: true, createdAt: date, updatedAt: date });
    expect(repo.findById).toHaveBeenCalledWith(input.id);
    expect(repo.create).toHaveBeenCalledWith(expect.any(Product));
    expect(result).not.toBeInstanceOf(Product);
  });

  it('rejects duplicate IDs even for inactive products', async () => {
    const existing = product();
    existing.deactivate();
    const repo = repository(existing);
    await expect(new CreateProductUseCase(repo).execute(input)).rejects.toBeInstanceOf(ProductAlreadyExistsError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('validates creation before persistence', async () => {
    const repo = repository();
    await expect(new CreateProductUseCase(repo).execute({ ...input, price: -1 })).rejects.toBeInstanceOf(InvalidProductError);
    expect(repo.findById).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('gets inactive products by normalized ID and returns detached dates', async () => {
    const existing = product();
    existing.deactivate();
    const repo = repository(existing);
    const result = await new GetProductByIdUseCase(repo).execute(' classic-burger ');
    expect(repo.findById).toHaveBeenCalledWith(input.id);
    expect(result.isActive).toBe(false);
    result.createdAt.setFullYear(2000);
    expect(existing.createdAt).toEqual(date);
  });

  it('lists all products or filters by a validated category', async () => {
    const repo = repository(product());
    const useCase = new ListProductsUseCase(repo);
    expect(await useCase.execute()).toHaveLength(1);
    expect(repo.findAll).toHaveBeenCalledOnce();
    expect(repo.findByCategoryId).not.toHaveBeenCalled();
    expect(await useCase.execute({ categoryId: 1 })).toHaveLength(1);
    expect(repo.findByCategoryId).toHaveBeenCalledWith(1);
    await expect(useCase.execute({ categoryId: 0 })).rejects.toBeInstanceOf(InvalidProductCategoryError);
    expect(repo.findByCategoryId).toHaveBeenCalledOnce();
    expect(await new ListProductsUseCase(repository()).execute()).toEqual([]);
  });

  it('updates all editable fields through the domain and preserves identity and creation date', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-09-17T12:00:00Z');
    vi.setSystemTime(now);
    const repo = repository(product());
    const result = await new UpdateProductUseCase(repo).execute({
      id: ' classic-burger ', name: ' Novo nome ', description: '', price: 0,
      categoryId: 2, imageUrl: ' /new.png ', mobileImageUrl: ' /new-mobile.png ',
      imageAlt: '', isActive: false,
    });
    expect(result).toEqual({
      id: input.id, name: 'Novo nome', description: '', price: 0, categoryId: 2,
      imageUrl: '/new.png', mobileImageUrl: '/new-mobile.png', imageAlt: 'Novo nome',
      isActive: false, createdAt: date, updatedAt: now,
    });
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it.each(['imageUrl', 'mobileImageUrl'] as const)('updates only %s while preserving omitted fields', async (field) => {
    const result = await new UpdateProductUseCase(repository(product())).execute({ id: input.id, [field]: '/new.png' });
    expect(result).toMatchObject({ ...input, [field]: '/new.png' });
  });

  it('preserves the loaded entity and avoids persistence after a later validation failure', async () => {
    const existing = product();
    const repo = repository(existing);
    await expect(new UpdateProductUseCase(repo).execute({ id: input.id, name: 'Changed', price: -1 })).rejects.toBeInstanceOf(InvalidProductError);
    expect(existing.name).toBe(input.name);
    expect(existing.updatedAt).toEqual(date);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('deactivates through update and supports subsequent reactivation', async () => {
    const existing = product();
    const repo = repository(existing);
    await new DeleteProductUseCase(repo).execute(' classic-burger ');
    expect(repo.findById).toHaveBeenCalledWith(input.id);
    expect(repo.update).toHaveBeenCalledWith(existing);
    expect(existing.isActive).toBe(false);
    await new DeleteProductUseCase(repo).execute(input.id);
    const result = await new UpdateProductUseCase(repo).execute({ id: input.id, isActive: true });
    expect(result.isActive).toBe(true);
  });

  it('reports missing products for get, update and delete without writing', async () => {
    const repo = repository();
    await expect(new GetProductByIdUseCase(repo).execute(input.id)).rejects.toBeInstanceOf(ProductNotFoundError);
    await expect(new UpdateProductUseCase(repo).execute({ id: input.id, name: 'New' })).rejects.toBeInstanceOf(ProductNotFoundError);
    await expect(new DeleteProductUseCase(repo).execute(input.id)).rejects.toBeInstanceOf(ProductNotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('propagates persistence errors', async () => {
    const repo = repository(product());
    const error = new Error('database unavailable');
    repo.update.mockRejectedValue(error);
    await expect(new UpdateProductUseCase(repo).execute({ id: input.id, price: 20 })).rejects.toBe(error);
    await expect(new DeleteProductUseCase(repo).execute(input.id)).rejects.toBe(error);
  });
});
