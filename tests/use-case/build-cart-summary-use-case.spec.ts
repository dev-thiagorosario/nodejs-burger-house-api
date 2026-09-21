import { describe, expect, it, vi } from 'vitest';

import { Product, type ProductProps } from '../../src/entities/product-entity.js';
import { InvalidCartSummaryError } from '../../src/exception/invalid-cart-summary-error.js';
import { ProductNotAvailableError } from '../../src/exception/product-not-available-error.js';
import { ProductNotFoundError } from '../../src/exception/product-not-found-error.js';
import type { IProductRepository } from '../../src/repository/i-product-repository.js';
import { BuildCartSummaryUseCase } from '../../src/use-case/cart/build-cart-summary-use-case.js';

const date = new Date('2026-09-01T12:00:00Z');

function product(props: Partial<ProductProps> = {}) {
  return new Product({
    id: 'duplo-da-casa', name: 'Duplo da Casa', description: 'Carne e queijo',
    price: 29.9, categoryId: 1, createdAt: date, updatedAt: date, ...props,
  });
}

function repository(products: Product[] = []) {
  return {
    findByIds: vi.fn(async (_ids: string[]) => products),
    findById: vi.fn(async () => null),
    findAll: vi.fn(async () => []),
    findByCategoryId: vi.fn(async () => []),
    create: vi.fn(async (value: Product) => value),
    update: vi.fn(async (value: Product) => value),
  } satisfies IProductRepository;
}

describe('BuildCartSummaryUseCase', () => {
  it('summarizes one product using the persisted name and price without writing or changing it', async () => {
    const existing = product();
    const repo = repository([existing]);

    const result = await new BuildCartSummaryUseCase(repo).execute({
      items: [{ productId: existing.id, quantity: 1 }],
    });

    expect(result).toEqual({
      items: [{ productId: existing.id, name: existing.name, unitPrice: 29.9, quantity: 1, subtotal: 29.9 }],
      totalItems: 1,
      total: 29.9,
    });
    expect(repo.findByIds).toHaveBeenCalledExactlyOnceWith([existing.id]);
    expect(repo.findById).not.toHaveBeenCalled();
    expect(repo.findAll).not.toHaveBeenCalled();
    expect(repo.findByCategoryId).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(existing.price).toBe(29.9);
    expect(existing.isActive).toBe(true);
    expect(existing.updatedAt).toEqual(date);
    expect(result.items[0]).not.toBeInstanceOf(Product);
  });

  it('calculates subtotals and totals for multiple quantities in input order even when the repository reorders products', async () => {
    const burger = product();
    const fries = product({ id: 'batata-frita', name: 'Batata Frita', price: 14.9, categoryId: 3 });
    const repo = repository([fries, burger]);

    const result = await new BuildCartSummaryUseCase(repo).execute({
      items: [{ productId: burger.id, quantity: 2 }, { productId: fries.id, quantity: 1 }],
    });

    expect(result).toEqual({
      items: [
        { productId: burger.id, name: burger.name, unitPrice: 29.9, quantity: 2, subtotal: 59.8 },
        { productId: fries.id, name: fries.name, unitPrice: 14.9, quantity: 1, subtotal: 14.9 },
      ],
      totalItems: 3,
      total: 74.7,
    });
    expect(repo.findByIds).toHaveBeenCalledExactlyOnceWith([burger.id, fries.id]);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('fetches repeated product IDs once and preserves each input line and quantity', async () => {
    const existing = product({ price: 0.1 });
    const repo = repository([existing]);

    const result = await new BuildCartSummaryUseCase(repo).execute({
      items: [{ productId: existing.id, quantity: 1 }, { productId: existing.id, quantity: 2 }],
    });

    expect(result).toEqual({
      items: [
        { productId: existing.id, name: existing.name, unitPrice: 0.1, quantity: 1, subtotal: 0.1 },
        { productId: existing.id, name: existing.name, unitPrice: 0.1, quantity: 2, subtotal: 0.2 },
      ],
      totalItems: 3,
      total: 0.3,
    });
    expect(repo.findByIds).toHaveBeenCalledExactlyOnceWith([existing.id]);
  });

  it('uses the current persisted price on each summary and avoids floating point artifacts', async () => {
    const existing = product({ price: 0.1 });
    const repo = repository([existing]);
    const useCase = new BuildCartSummaryUseCase(repo);
    const input = { items: [{ productId: existing.id, quantity: 3 }] };

    expect(await useCase.execute(input)).toMatchObject({
      items: [{ unitPrice: 0.1, subtotal: 0.3 }], total: 0.3,
    });
    existing.changePrice(0.29);
    expect(await useCase.execute(input)).toMatchObject({
      items: [{ unitPrice: 0.29, subtotal: 0.87 }], total: 0.87,
    });
    expect(repo.findByIds).toHaveBeenCalledTimes(2);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('supports available products with a zero price', async () => {
    const existing = product({ price: 0 });
    const result = await new BuildCartSummaryUseCase(repository([existing])).execute({
      items: [{ productId: existing.id, quantity: 2 }],
    });
    expect(result).toMatchObject({ items: [{ unitPrice: 0, subtotal: 0 }], totalItems: 2, total: 0 });
  });

  it('rejects a missing product even when other requested products exist', async () => {
    const existing = product();
    const repo = repository([existing]);

    await expect(new BuildCartSummaryUseCase(repo).execute({
      items: [{ productId: existing.id, quantity: 2 }, { productId: 'missing-product', quantity: 1 }],
    })).rejects.toBeInstanceOf(ProductNotFoundError);

    expect(repo.findByIds).toHaveBeenCalledExactlyOnceWith([existing.id, 'missing-product']);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects an inactive product without reactivating or persisting it', async () => {
    const existing = product({ isActive: false });
    const repo = repository([existing]);

    await expect(new BuildCartSummaryUseCase(repo).execute({
      items: [{ productId: existing.id, quantity: 1 }],
    })).rejects.toBeInstanceOf(ProductNotAvailableError);

    expect(existing.isActive).toBe(false);
    expect(existing.updatedAt).toEqual(date);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects a subtotal that exceeds the safe integer range in cents', async () => {
    const existing = product({ price: 1 });
    await expect(new BuildCartSummaryUseCase(repository([existing])).execute({
      items: [{ productId: existing.id, quantity: Number.MAX_SAFE_INTEGER }],
    })).rejects.toBeInstanceOf(InvalidCartSummaryError);
  });

  it('rejects totals whose cents would be lost when serialized as a number', async () => {
    const existing = product({ price: 0.01 });
    await expect(new BuildCartSummaryUseCase(repository([existing])).execute({
      items: [{ productId: existing.id, quantity: Number.MAX_SAFE_INTEGER }],
    })).rejects.toBeInstanceOf(InvalidCartSummaryError);
  });

  it('rejects a monetary total that exceeds the safe integer range despite individually safe subtotals', async () => {
    const existing = product({ price: 0.02 });
    const quantity = Math.floor(Number.MAX_SAFE_INTEGER / 4) + 1;
    await expect(new BuildCartSummaryUseCase(repository([existing])).execute({
      items: [{ productId: existing.id, quantity }, { productId: existing.id, quantity }],
    })).rejects.toBeInstanceOf(InvalidCartSummaryError);
  });

  it('rejects a total item count that exceeds the safe integer range even for free products', async () => {
    const existing = product({ price: 0 });
    await expect(new BuildCartSummaryUseCase(repository([existing])).execute({
      items: [{ productId: existing.id, quantity: Number.MAX_SAFE_INTEGER }, { productId: existing.id, quantity: 1 }],
    })).rejects.toBeInstanceOf(InvalidCartSummaryError);
  });

  it('propagates repository failures', async () => {
    const repo = repository();
    const error = new Error('database unavailable');
    repo.findByIds.mockRejectedValue(error);

    await expect(new BuildCartSummaryUseCase(repo).execute({
      items: [{ productId: 'duplo-da-casa', quantity: 1 }],
    })).rejects.toBe(error);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});
