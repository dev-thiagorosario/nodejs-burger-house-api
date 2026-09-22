export type OrderStatusValue = 'pending' | 'pickedUp' | 'cancelled';

export const ORDER_STATUS_FILTERS = ['pending', 'withdrawn', 'cancelled'] as const;
export type OrderStatusFilter = typeof ORDER_STATUS_FILTERS[number];

export class InvalidOrderStatusError extends Error {
  constructor(message = 'O status do pedido é inválido.') {
    super(message);
    this.name = 'InvalidOrderStatusError';
  }
}

export class OrderStatus {
  public readonly value: OrderStatusValue;

  constructor(value: OrderStatusValue) {
    if (!['pending', 'pickedUp', 'cancelled'].includes(value)) {
      throw new InvalidOrderStatusError();
    }
    this.value = value;
    Object.freeze(this);
  }

  static pending(): OrderStatus { return new OrderStatus('pending'); }
  static pickedUp(): OrderStatus { return new OrderStatus('pickedUp'); }
  static cancelled(): OrderStatus { return new OrderStatus('cancelled'); }

  static fromFilter(filter: OrderStatusFilter): OrderStatus {
    if (!ORDER_STATUS_FILTERS.includes(filter)) {
      throw new InvalidOrderStatusError();
    }
    return filter === 'withdrawn' ? OrderStatus.pickedUp() : new OrderStatus(filter);
  }

  isPending(): boolean { return this.value === 'pending'; }
  isPickedUp(): boolean { return this.value === 'pickedUp'; }
  isCancelled(): boolean { return this.value === 'cancelled'; }
  equals(other: OrderStatus): boolean { return this.value === other.value; }

  canTransitionTo(next: OrderStatus): boolean {
    return this.isPending() && !next.isPending();
  }

  transitionTo(next: OrderStatus): OrderStatus {
    if (!this.canTransitionTo(next)) {
      throw new InvalidOrderStatusError('Apenas pedidos pendentes podem ser cancelados ou retirados.');
    }
    return new OrderStatus(next.value);
  }
}
