import { afterEach, describe, expect, it, vi } from 'vitest';
import { Product, InvalidProductError, type ProductProps } from '../../src/entities/product-entity.js';

const props: ProductProps = {
  id: 'burger-classic',
  name: 'Classic Burger',
  description: 'Pão, carne e queijo',
  price: 25.9,
  categoryId: 1,
  createdAt: new Date('2026-09-01T12:00:00Z'),
  updatedAt: new Date('2026-09-01T12:00:00Z'),
};

afterEach(() => vi.useRealTimers());

describe('Product', () => {
  it('normalizes the name and starts active unless explicitly inactive', () => {
    const product = new Product({
      ...props, id: ' classic-burger ', name: ' Classic Burger ',
    });
    expect(product.id).toBe('classic-burger');
    expect(product.name).toBe(props.name);
    expect(product.imageAlt).toBe(props.name);
    expect(product.isActive).toBe(true);
    expect(new Product({ ...props, isActive: false }).isActive).toBe(false);
  });

  it.each([-1, NaN, Infinity, -Infinity, 1.001, 0.001, 1e-7, 100_000_000, 99_999_999.991])('rejects invalid price %s without changing state', (price) => {
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

  it.each(['', '   ', 'a'.repeat(256)])('rejects invalid names on creation and rename (%j)', (name) => {
    expect(() => new Product({ ...props, name })).toThrow(InvalidProductError);
    const product = new Product(props);
    expect(() => product.rename(name)).toThrow(InvalidProductError);
    expect(product.name).toBe(props.name);
    expect(product.updatedAt).toEqual(props.updatedAt);
  });

  it.each(['', ' ', 'Classic-burger', 'classic_burger', 'classic burger', '-burger', 'burger-', 'classic--burger', 'hambúrguer', 'a'.repeat(256)])('rejects invalid ID %j', (id) => {
    expect(() => new Product({ ...props, id })).toThrow(InvalidProductError);
  });

  it('accepts the schema character limits after trimming', () => {
    const product = new Product({ ...props, id: ` ${'a'.repeat(255)} `, name: ` ${'🍔'.repeat(255)} ` });
    expect(product.id).toHaveLength(255);
    expect(product.name).toBe('🍔'.repeat(255));
    product.rename('a'.repeat(255));
    expect(product.name).toHaveLength(255);
  });

  it.each([0, 0.01, 0.29, 1.1, 25.9, 99_999_999.99])('accepts valid price %s on creation and change', (price) => {
    expect(new Product({ ...props, price }).price).toBe(price);
    const product = new Product(props);
    product.changePrice(price);
    expect(product.price).toBe(price);
  });

  it.each([undefined, '', '   '])('uses the name for missing or blank imageAlt (%j)', (imageAlt) => {
    const input = imageAlt === undefined ? props : { ...props, imageAlt };
    expect(new Product(input).imageAlt).toBe(props.name);
  });

  it('normalizes alternative text and falls back to the current name when cleared', () => {
    const product = new Product({ ...props, imageAlt: ' Foto do produto ' });
    expect(product.imageAlt).toBe('Foto do produto');
    product.changeImageAlt(' Outra foto ');
    expect(product.imageAlt).toBe('Outra foto');
    product.rename('Novo nome');
    expect(product.imageAlt).toBe('Outra foto');
    product.changeImageAlt('   ');
    expect(product.imageAlt).toBe('Novo nome');
    product.changeImageAlt('');
    expect(product.imageAlt).toBe('Novo nome');
  });

  it('allows no images and protects loaded metadata from external mutation', () => {
    expect(new Product(props).images).toEqual([]);
    const images = [{ variant: 'desktop' as const, fileName: 'burger.png', mimeType: 'image/png' }];
    const product = new Product({ ...props, images });
    images[0]!.fileName = 'changed.png';
    product.images[0]!.fileName = 'also-changed.png';
    expect(product.images[0]!.fileName).toBe('burger.png');
    expect(() => new Product({ ...props, images: [images[0]!, images[0]!] })).toThrow(InvalidProductError);
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
      () => product.changeImageAlt(' Nova foto '),
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
    expect(product.imageAlt).toBe('Nova foto');
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
