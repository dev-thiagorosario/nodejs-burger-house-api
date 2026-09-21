import type { Order, OrderStatus } from '../../entities/order-entity.js';

export interface OrderOutput {
  id: number;
  userId: string;
  status: OrderStatus;
  items: Array<{
    id: number;
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  totalItems: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toOrderOutput(order: Order): OrderOutput {
  const items = order.items;
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
