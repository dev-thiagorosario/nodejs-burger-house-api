export type OrderStatusValue = 'pending' | 'pickedUp' | 'cancelled';

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
