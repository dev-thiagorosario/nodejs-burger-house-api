import { afterEach, describe, expect, it, vi } from 'vitest';
import { Product, InvalidProductError, type ProductProps } from '../../src/entities/product-entity.js';

const props: ProductProps = {
  id: 'burger-classic',
  name: 'Classic Burger',
  description: 'Pão, carne e queijo',
  price: 25.9,
  categoryId: 1,
  imageUrl: '/images/classic.png',
  createdAt: new Date('2026-09-01T12:00:00Z'),
  updatedAt: new Date('2026-09-01T12:00:00Z'),
};

afterEach(() => vi.useRealTimers());

describe('Product', () => {
  it('normalizes the name and starts active unless explicitly inactive', () => {
    const product = new Product({ ...props, name: ' Classic Burger ' });
    expect(product.name).toBe(props.name);
    expect(product.isActive).toBe(true);
    expect(new Product({ ...props, isActive: false }).isActive).toBe(false);
  });

  it.each([-1, NaN, Infinity, -Infinity])('rejects invalid price %s without changing state', (price) => {
    expect(() => new Product({ ...props, price })).toThrow(InvalidProductError);
    const product = new Product(props);
    expect(() => product.changePrice(price)).toThrow(InvalidProductError);
    expect(product.price).toBe(props.price);
    expect(product.updatedAt).toEqual(props.updatedAt);
  });

  it.each([0, -1, 4, 1.5, NaN, Infinity])('rejects invalid category %s without changing state', (categoryId) => {
    expect(() => new Product({ ...props, categoryId })).toThrow(InvalidProductError);
    const product = new Product(props);
    expect(() => product.changeCategory(categoryId)).toThrow(InvalidProductError);
    expect(product.categoryId).toBe(props.categoryId);
    expect(product.updatedAt).toEqual(props.updatedAt);
  });

  it.each(['', '   '])('rejects blank names on creation and rename (%j)', (name) => {
    expect(() => new Product({ ...props, name })).toThrow(InvalidProductError);
    const product = new Product(props);
    expect(() => product.rename(name)).toThrow(InvalidProductError);
    expect(product.name).toBe(props.name);
    expect(product.updatedAt).toEqual(props.updatedAt);
  });

  it('changes its state through domain methods and updates the timestamp', () => {
    vi.useFakeTimers();
    const now = new Date('2026-09-10T12:00:00Z');
    vi.setSystemTime(now);
    const product = new Product(props);
    const changes = [
      () => product.rename(' Novo nome '),
      () => product.changePrice(0),
      () => product.changeDescription(''),
      () => product.changeCategory(2),
      () => product.deactivate(),
      () => product.activate(),
    ];
    for (const change of changes) {
      vi.advanceTimersByTime(1000);
      change();
      expect(product.updatedAt.getTime()).toBe(Date.now());
    }
    expect(product.name).toBe('Novo nome');
    expect(product.price).toBe(0);
    expect(product.description).toBe('');
    expect(product.categoryId).toBe(2);
    expect(product.category.name).toBe('Porcoes');
    expect(product.isActive).toBe(true);
    product.deactivate();
    expect(product.isActive).toBe(false);
    expect(product.createdAt).toEqual(props.createdAt);
  });

  it.each([
    { id: ' ' },
    { createdAt: new Date('invalid') },
    { updatedAt: new Date('invalid') },
    { updatedAt: new Date('2020-01-01') },
    { isActive: 'true' },
  ])('rejects invalid properties %j', (changes) => {
    expect(() => new Product({ ...props, ...changes } as ProductProps)).toThrow(InvalidProductError);
  });

  it('protects dates from mutation through constructor inputs and getters', () => {
    const input = { ...props, createdAt: new Date(props.createdAt), updatedAt: new Date(props.updatedAt) };
    const product = new Product(input);
    input.createdAt.setFullYear(2000);
    input.updatedAt.setFullYear(2000);
    product.createdAt.setFullYear(2000);
    product.updatedAt.setFullYear(2000);
    expect(product.createdAt).toEqual(props.createdAt);
    expect(product.updatedAt).toEqual(props.updatedAt);
  });
});
