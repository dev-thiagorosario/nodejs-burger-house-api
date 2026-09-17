import { describe, expect, it } from 'vitest';
import { OrderStatus, InvalidOrderStatusError, type OrderStatusValue } from '../../src/value-object/order-status-value-object.js';

describe('OrderStatus', () => {
  it.each(['pending', 'pickedUp', 'cancelled'] as const)('compares %s by value and is immutable', value => {
    const status = new OrderStatus(value);
    expect(status.equals(new OrderStatus(value))).toBe(true);
    expect(status.isPending()).toBe(value === 'pending');
    expect(status.isPickedUp()).toBe(value === 'pickedUp');
    expect(status.isCancelled()).toBe(value === 'cancelled');
    expect(() => Object.assign(status, { value: 'invalid' })).toThrow();
  });

  it.each(['invalid', '', 'Pending', null, 1])('rejects invalid status %j', value => {
    expect(() => new OrderStatus(value as OrderStatusValue)).toThrow(InvalidOrderStatusError);
  });

  for (const from of ['pending', 'pickedUp', 'cancelled'] as const) {
    for (const to of ['pending', 'pickedUp', 'cancelled'] as const) {
      it(`validates transition from ${from} to ${to}`, () => {
        const current = new OrderStatus(from);
        const next = new OrderStatus(to);
        const allowed = from === 'pending' && to !== 'pending';
        expect(current.canTransitionTo(next)).toBe(allowed);
        if (allowed) expect(current.transitionTo(next).equals(next)).toBe(true);
        else expect(() => current.transitionTo(next)).toThrow(InvalidOrderStatusError);
        expect(current.value).toBe(from);
      });
    }
  }

  it('provides factories for each status', () => {
    expect(OrderStatus.pending().isPending()).toBe(true);
    expect(OrderStatus.pickedUp().isPickedUp()).toBe(true);
    expect(OrderStatus.cancelled().isCancelled()).toBe(true);
  });
});
