import type { Order, OrderStatus } from '../entities/order-entity.js';
import type { OrderItemProps } from '../entities/order-item-entity.js';

export interface CreateOrderData {
  userId: string;
  items: readonly Omit<OrderItemProps, 'id'>[];
}

export interface IOrderCreator {
  create(data: CreateOrderData): Promise<Order>;
}

export interface OrderDetails {
  order: Order;
  user: { id: string; fullName: string };
}

export interface IOrderStatusWriter {
  updateStatus(id: number, statusId: number): Promise<OrderDetails>;
}

export interface OrderFilters {
  userId?: string;
  status?: OrderStatus;
}

export interface IOrderReader {
  findById(id: number): Promise<Order | null>;
  findAll(filters?: OrderFilters): Promise<OrderDetails[]>;
  findByUserId(userId: string): Promise<OrderDetails[]>;
}

export interface IOrderWriter extends IOrderCreator {
  update(order: Order): Promise<Order>;
}

export interface IOrderRepository extends IOrderReader, IOrderWriter {}
