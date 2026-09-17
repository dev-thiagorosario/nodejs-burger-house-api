import { describe, expect, it } from 'vitest';
import { OrderItem, InvalidOrderItemError } from '../../src/entities/order-item-entity.js';
import { Order } from '../../src/entities/order-entity.js';
import { Product } from '../../src/entities/product-entity.js';

const props = { id: 1, productId: 'duplo', productName: 'Duplo da Casa', quantity: 2, unitPrice: 29.9 };

describe('OrderItem', () => {
  it('calculates its subtotal and ignores externally supplied totals', () => {
    const item = new OrderItem({ ...props, subtotal: 1 } as typeof props);
    expect(item.subtotal).toBe(59.8);
    expect(item.getSubtotal()).toBe(59.8);
    expect(item.subtotalCents).toBe(5980);
    expect(new OrderItem({ ...props, quantity: 3, unitPrice: 0.1 }).subtotal).toBe(0.3);
    expect(new OrderItem({ ...props, unitPrice: 0 }).subtotal).toBe(0);
  });

  it('preserves the commercial snapshot after product and input changes', () => {
    const product = new Product({
      id: props.productId, name: props.productName, price: props.unitPrice,
      description: '', categoryId: 1,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const input = { ...props, productName: product.name, unitPrice: product.price };
    const item = new OrderItem(input);
    product.changePrice(35.9);
    product.rename('Novo nome');
    input.unitPrice = 35.9;
    input.productName = 'Outro nome';
    expect(item.productName).toBe('Duplo da Casa');
    expect(item.unitPrice).toBe(29.9);
    expect(item.subtotal).toBe(59.8);
    expect(() => Object.assign(item, { quantity: 10 })).toThrow();
  });

  it.each([
    { id: 0 }, { id: -1 }, { id: 1.5 }, { id: NaN },
    { productId: ' ' }, { productName: ' ' },
    { quantity: 0 }, { quantity: -1 }, { quantity: 1.5 },
    { quantity: Infinity }, { quantity: NaN }, { quantity: Number.MAX_SAFE_INTEGER + 1 },
    { unitPrice: -1 }, { unitPrice: NaN }, { unitPrice: Infinity },
    { unitPrice: 0.001 }, { unitPrice: 1e-10 },
    { unitPrice: Number.MAX_SAFE_INTEGER },
    { quantity: Number.MAX_SAFE_INTEGER, unitPrice: 1 },
  ])('rejects invalid properties %j', changes => {
    expect(() => new OrderItem({ ...props, ...changes })).toThrow(InvalidOrderItemError);
  });

  it('integrates with Order as an immutable item', () => {
    const order = new Order({ id: 1, userId: 'a76c2afe-5996-48ca-9262-e01e9b68bdee', createdAt: new Date(), updatedAt: new Date() });
    order.addItem(new OrderItem(props));
    expect(order.items[0]).toBeInstanceOf(OrderItem);
    expect(order.total).toBe(59.8);
    expect(() => order.addItem({ ...props, productId: 'other' })).toThrow();
    expect(order.total).toBe(59.8);
  });
});
