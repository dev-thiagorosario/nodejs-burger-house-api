import { OrderStatus as OrderStatusObject, InvalidOrderStatusError } from '../value-object/order-status-value-object.js';
import type { OrderStatusValue } from '../value-object/order-status-value-object.js';

import { OrderItem, InvalidOrderItemError, type OrderItemProps } from './order-item-entity.js';

export type OrderStatus = OrderStatusValue;

export interface OrderProps {
  id: number;
  userId: string;
  status?: OrderStatus;
  items?: readonly OrderItemProps[];
  createdAt: Date;
  updatedAt: Date;
}

export class InvalidOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderError';
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class Order {
  public readonly id: number;
  public readonly userId: string;
  private statusValue: OrderStatusObject;
  private itemsValue: readonly OrderItem[];
  private readonly createdAtValue: Date;
  private updatedAtValue: Date;

  constructor(props: OrderProps) {
    if (!Number.isSafeInteger(props.id) || props.id <= 0) {
      throw new InvalidOrderError('O identificador do pedido deve ser um inteiro positivo.');
    }
    if (!UUID_PATTERN.test(props.userId.trim())) {
      throw new InvalidOrderError('O identificador do usuário deve ser um UUID.');
    }
    const status = this.createStatus(props.status ?? 'pending');
    if (
      !Number.isFinite(props.createdAt.getTime()) ||
      !Number.isFinite(props.updatedAt.getTime()) ||
      props.updatedAt.getTime() < props.createdAt.getTime()
    ) {
      throw new InvalidOrderError('As datas do pedido são inválidas.');
    }
    const items = (props.items ?? []).map(item => this.createItem(item));
    if (new Set(items.map(item => item.productId)).size !== items.length) {
      throw new InvalidOrderError('O pedido não pode conter produtos duplicados.');
    }
    if (new Set(items.map(item => item.id)).size !== items.length) {
      throw new InvalidOrderError('O pedido não pode conter identificadores de item duplicados.');
    }
    if (status.isPickedUp() && items.length === 0) {
      throw new InvalidOrderError('Um pedido vazio não pode ser retirado.');
    }
    this.calculateTotalCents(items);
    this.id = props.id;
    this.userId = props.userId.trim();
    this.statusValue = status;
    this.itemsValue = items;
    this.createdAtValue = new Date(props.createdAt);
    this.updatedAtValue = new Date(props.updatedAt);
  }

  get status(): OrderStatus { return this.statusValue.value; }
  get orderStatus(): OrderStatusObject { return this.statusValue; }
  get items(): readonly OrderItem[] { return [...this.itemsValue]; }
  get total(): number { return this.getTotal(); }
  get createdAt(): Date { return new Date(this.createdAtValue); }
  get updatedAt(): Date { return new Date(this.updatedAtValue); }

  getTotal(): number {
    return this.calculateTotalCents(this.itemsValue) / 100;
  }

  addItem(props: OrderItemProps): void {
    this.ensurePending();
    const item = this.createItem(props);
    if (this.itemsValue.some(existing => existing.productId === item.productId)) {
      throw new InvalidOrderError('O produto já está no pedido.');
    }
    if (this.itemsValue.some(existing => existing.id === item.id)) {
      throw new InvalidOrderError('O identificador do item já está no pedido.');
    }
    const items = [...this.itemsValue, item];
    this.calculateTotalCents(items);
    this.itemsValue = items;
    this.touch();
  }

  removeItem(productId: string): void {
    this.ensurePending();
    const items = this.itemsValue.filter(item => item.productId !== productId.trim());
    if (items.length === this.itemsValue.length) {
      throw new InvalidOrderError('O produto não está no pedido.');
    }
    this.itemsValue = items;
    this.touch();
  }

  cancel(): void {
    this.ensurePending();
    this.statusValue = this.statusValue.transitionTo(OrderStatusObject.cancelled());
    this.touch();
  }

  markAsPickedUp(): void {
    this.ensurePending();
    if (this.itemsValue.length === 0) {
      throw new InvalidOrderError('Um pedido vazio não pode ser retirado.');
    }
    this.statusValue = this.statusValue.transitionTo(OrderStatusObject.pickedUp());
    this.touch();
  }

  private ensurePending(): void {
    if (!this.statusValue.isPending()) {
      throw new InvalidOrderError('Apenas pedidos pendentes podem ser alterados.');
    }
  }

  private createStatus(status: OrderStatus): OrderStatusObject {
    try {
      return new OrderStatusObject(status);
    } catch (error) {
      if (error instanceof InvalidOrderStatusError) {
        throw new InvalidOrderError(error.message);
      }
      throw error;
    }
  }

  private createItem(props: OrderItemProps): OrderItem {
    try {
      return new OrderItem(props);
    } catch (error) {
      if (error instanceof InvalidOrderItemError) {
        throw new InvalidOrderError(error.message);
      }
      throw error;
    }
  }

  private calculateTotalCents(items: readonly OrderItem[]): number {
    const total = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    if (!Number.isSafeInteger(total)) {
      throw new InvalidOrderError('O total do pedido excede o limite suportado.');
    }
    return total;
  }

  private touch(): void {
    this.updatedAtValue = new Date(Math.max(Date.now(), this.updatedAtValue.getTime()));
  }
}
