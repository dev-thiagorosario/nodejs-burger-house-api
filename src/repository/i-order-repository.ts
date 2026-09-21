import type { Order } from '../entities/order-entity.js';
import type { OrderItemProps } from '../entities/order-item-entity.js';

export interface CreateOrderData {
  userId: string;
  items: readonly Omit<OrderItemProps, 'id'>[];
}

export interface IOrderCreator {
  create(data: CreateOrderData): Promise<Order>;
}

export interface IOrderReader {
  findById(id: number): Promise<Order | null>;
  findAll(): Promise<Order[]>;
  findByUserId(userId: string): Promise<Order[]>;
}

export interface IOrderWriter extends IOrderCreator {
  update(order: Order): Promise<Order>;
}

export interface IOrderRepository extends IOrderReader, IOrderWriter {}
