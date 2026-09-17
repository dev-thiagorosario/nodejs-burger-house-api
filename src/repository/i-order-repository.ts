import type { Order } from '../entities/order-entity.js';

export interface IOrderReader {
  findById(id: number): Promise<Order | null>;
  findAll(): Promise<Order[]>;
  findByUserId(userId: string): Promise<Order[]>;
}

export interface IOrderWriter {
  create(order: Order): Promise<Order>;
  update(order: Order): Promise<Order>;
}

export interface IOrderRepository extends IOrderReader, IOrderWriter {}
