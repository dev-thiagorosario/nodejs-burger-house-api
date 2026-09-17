import { describe, expect, it, vi, afterEach } from 'vitest';
import { Order, InvalidOrderError, type OrderProps } from '../../src/entities/order-entity.js';

const props: OrderProps = {
  id: 1,
  userId: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
  createdAt: new Date('2026-09-01T12:00:00Z'),
  updatedAt: new Date('2026-09-01T12:00:00Z'),
};
const item = { id: 1, productId: 'burger', productName: 'Burger', quantity: 2, unitPrice: 12.9 };
afterEach(() => vi.useRealTimers());

describe('Order', () => {
  it('starts pending and calculates totals after adding and removing items', () => {
    const order = new Order(props);
    expect(order.status).toBe('pending');
    expect(order.total).toBe(0);
    order.addItem(item);
    expect(order.items[0]?.subtotal).toBe(25.8);
    order.addItem({ ...item, id: 2, productId: 'drink', quantity: 1, unitPrice: 0.1 });
    expect(order.getTotal()).toBe(25.9);
    order.removeItem('burger');
    expect(order.total).toBe(0.1);
  });

  it('avoids floating point errors when summing money', () => {
    const order = new Order({ ...props, items: [
      { ...item, quantity: 1, unitPrice: 0.1 },
      { ...item, id: 2, productId: 'drink', quantity: 1, unitPrice: 0.2 },
    ] });
    expect(order.total).toBe(0.3);
  });

  it.each(['cancelled', 'pickedUp'] as const)('prevents all mutations after %s', status => {
    const order = new Order({ ...props, items: [item] });
    if (status === 'cancelled') order.cancel();
    else order.markAsPickedUp();
    for (const mutate of [
      () => order.addItem({ ...item, id: 2, productId: 'drink' }),
      () => order.removeItem(item.productId),
      () => order.cancel(),
      () => order.markAsPickedUp(),
    ]) expect(mutate).toThrow(InvalidOrderError);
    expect(order.status).toBe(status);
    expect(order.orderStatus.value).toBe(status);
    expect(order.total).toBe(25.8);
    expect(new Order({ ...props, status, items: [item] }).status).toBe(status);
  });

  it('rejects pickup of an empty order both on transition and restoration', () => {
    expect(() => new Order(props).markAsPickedUp()).toThrow(InvalidOrderError);
    expect(() => new Order({ ...props, status: 'pickedUp' })).toThrow(InvalidOrderError);
  });

  it.each([
    { quantity: 0 }, { quantity: -1 }, { quantity: 1.5 },
    { unitPrice: -1 }, { unitPrice: NaN }, { unitPrice: Infinity }, { unitPrice: 1.001 },
    { unitPrice: Number.MAX_SAFE_INTEGER }, { productId: ' ' }, { productName: ' ' },
  ])('rejects invalid items without changing the order: %j', changes => {
    const invalid = { ...item, ...changes };
    expect(() => new Order({ ...props, items: [invalid] })).toThrow(InvalidOrderError);
    const order = new Order(props);
    expect(() => order.addItem(invalid)).toThrow(InvalidOrderError);
    expect(order.items).toEqual([]);
    expect(order.updatedAt).toEqual(props.updatedAt);
  });

  it('rejects duplicate products and removal of missing products', () => {
    expect(() => new Order({ ...props, items: [item, item] })).toThrow(InvalidOrderError);
    const order = new Order({ ...props, items: [item] });
    expect(() => order.addItem(item)).toThrow(InvalidOrderError);
    expect(() => order.removeItem('missing')).toThrow(InvalidOrderError);
    expect(order.total).toBe(25.8);
  });

  it('isolates item snapshots, arrays and dates from external mutation', () => {
    const input = { ...props, createdAt: new Date(props.createdAt), updatedAt: new Date(props.updatedAt), items: [{ ...item }] };
    const order = new Order(input);
    input.items[0]!.unitPrice = 100;
    input.items.length = 0;
    input.createdAt.setFullYear(2000);
    input.updatedAt.setFullYear(2000);
    order.createdAt.setFullYear(2000);
    order.updatedAt.setFullYear(2000);
    const exposed = order.items;
    expect(() => Object.assign(exposed[0]!, { unitPrice: 100 })).toThrow();
    (exposed as unknown[]).length = 0;
    expect(order.total).toBe(25.8);
    expect(order.items).toHaveLength(1);
    expect(order.createdAt).toEqual(props.createdAt);
    expect(order.updatedAt).toEqual(props.updatedAt);
  });

  it('updates timestamps on item and status changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
    const order = new Order(props);
    for (const mutate of [() => order.addItem(item), () => order.removeItem('burger'), () => order.cancel()]) {
      vi.advanceTimersByTime(1000);
      mutate();
      expect(order.updatedAt.getTime()).toBe(Date.now());
    }
    expect(order.createdAt).toEqual(props.createdAt);
  });

  it.each([
    { id: 0 }, { id: 1.5 }, { userId: 'invalid' }, { status: 'invalid' },
    { createdAt: new Date('invalid') }, { updatedAt: new Date('invalid') },
    { updatedAt: new Date('2020-01-01') },
  ])('rejects invalid order properties %j', changes => {
    expect(() => new Order({ ...props, ...changes } as OrderProps)).toThrow(InvalidOrderError);
  });
});
