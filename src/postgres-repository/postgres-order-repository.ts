import type { Pool } from 'pg';

import { Order, type OrderStatus } from '../entities/order-entity.js';
import type { OrderItemProps } from '../entities/order-item-entity.js';
import type { CreateOrderData, IOrderCreator } from '../repository/i-order-repository.js';

interface OrderRow {
  id: number;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

interface OrderItemRow {
  id: number;
  product_id: string;
  name: string;
  quantity: number;
  price: string;
}

interface ListedOrderRow extends OrderRow {
  status: OrderStatus;
  item_id: number | null;
  product_id: string;
  name: string;
  quantity: number;
  price: string;
}

export class PostgresOrderRepository implements IOrderCreator {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<Order[]> {
    return this.list();
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.list(userId);
  }

  private async list(userId?: string): Promise<Order[]> {
    const result = await this.pool.query<ListedOrderRow>(
      `SELECT o.id, o.user_id, o.created_at, o.updated_at, s.name AS status,
         i.id AS item_id, i.product_id, i.name, i.quantity, i.price
       FROM orders o
       JOIN order_statuses s ON s.id = o.status_id
       LEFT JOIN order_items i ON i.order_id = o.id
       ${userId === undefined ? '' : 'WHERE o.user_id = $1'}
       ORDER BY o.created_at DESC, o.id DESC, i.id ASC`,
      userId === undefined ? [] : [userId],
    );
    const orders = new Map<number, { row: ListedOrderRow; items: OrderItemProps[] }>();
    for (const row of result.rows) {
      let entry = orders.get(row.id);
      if (!entry) {
        entry = { row, items: [] };
        orders.set(row.id, entry);
      }
      if (row.item_id !== null) {
        entry.items.push({
          id: row.item_id,
          productId: row.product_id,
          productName: row.name,
          quantity: row.quantity,
          unitPrice: Number(row.price),
        });
      }
    }
    return [...orders.values()].map(({ row, items }) => new Order({
      id: row.id,
      userId: row.user_id,
      status: row.status,
      items,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async create(data: CreateOrderData): Promise<Order> {
    const client = await this.pool.connect();
    let discardConnection = false;
    try {
      await client.query('BEGIN');
      const statusResult = await client.query<{ id: number }>(
        'SELECT id FROM order_statuses WHERE name = $1 LIMIT 1', ['pending'],
      );
      const status = statusResult.rows[0];
      if (!status) {
        throw new Error('O status inicial pending não está cadastrado.');
      }

      const orderResult = await client.query<OrderRow>(
        `INSERT INTO orders (user_id, status_id) VALUES ($1, $2)
         RETURNING id, user_id, created_at, updated_at`,
        [data.userId, status.id],
      );
      const row = orderResult.rows[0];
      if (!row) {
        throw new Error('O banco não retornou o pedido criado.');
      }

      const items: OrderItemProps[] = [];
      for (const item of data.items) {
        const itemResult = await client.query<OrderItemRow>(
          `INSERT INTO order_items (order_id, product_id, name, quantity, price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, product_id, name, quantity, price`,
          [row.id, item.productId, item.productName, item.quantity, item.unitPrice],
        );
        const itemRow = itemResult.rows[0];
        if (!itemRow) {
          throw new Error('O banco não retornou o item do pedido criado.');
        }
        items.push({
          id: itemRow.id,
          productId: itemRow.product_id,
          productName: itemRow.name,
          quantity: itemRow.quantity,
          unitPrice: Number(itemRow.price),
        });
      }

      const order = new Order({
        id: row.id,
        userId: row.user_id,
        status: 'pending',
        items,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
      await client.query('COMMIT');
      return order;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        discardConnection = true;
      }
      throw error;
    } finally {
      client.release(discardConnection);
    }
  }
}
