import { describe, expect, it } from 'vitest';
import { ProductCategory, InvalidProductCategoryError } from '../../src/value-object/product-category-value-object.js';

describe('ProductCategory', () => {
  it.each([[1, 'Hamburguer'], [2, 'Porcoes'], [3, 'Bebidas']] as const)('represents category %s', (id, name) => {
    const category = new ProductCategory(id);
    expect(category.id).toBe(id);
    expect(category.name).toBe(name);
    expect(category.equals(new ProductCategory(id))).toBe(true);
    expect(() => Object.assign(category, { id: 4 })).toThrow();
  });

  it.each([0, -1, 4, 1.5, NaN, Infinity])('rejects unknown category %s', id => {
    expect(() => new ProductCategory(id)).toThrow(InvalidProductCategoryError);
  });

  it('provides factories and compares distinct categories', () => {
    expect(ProductCategory.hamburguer().id).toBe(1);
    expect(ProductCategory.porcoes().id).toBe(2);
    expect(ProductCategory.bebidas().id).toBe(3);
    expect(ProductCategory.hamburguer().equals(ProductCategory.bebidas())).toBe(false);
  });
});
