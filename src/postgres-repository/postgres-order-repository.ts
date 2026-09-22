import type { Pool, PoolClient } from 'pg';

import { Order, InvalidOrderError, type OrderStatus } from '../entities/order-entity.js';
import type { OrderItemProps } from '../entities/order-item-entity.js';
import type { CreateOrderData, IOrderCreator, IOrderStatusWriter, OrderDetails, OrderFilters } from '../repository/i-order-repository.js';
import { OrderNotFoundError } from '../exception/order-not-found-error.js';
import { InvalidOrderStatusError, OrderStatus as Status } from '../value-object/order-status-value-object.js';

interface OrderRow {
  id: number;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  picked_up_at: Date | null;
}

interface OrderItemRow {
  id: number;
  product_id: string;
  name: string;
  quantity: number;
  price: string;
}

interface ListedOrderRow extends OrderRow {
  full_name: string;
  status: OrderStatus;
  item_id: number | null;
  product_id: string;
  name: string;
  quantity: number;
  price: string;
}

export class PostgresOrderRepository implements IOrderCreator, IOrderStatusWriter {
  constructor(private readonly pool: Pool) {}

  async findAll(filters: OrderFilters = {}): Promise<OrderDetails[]> {
    return this.list(filters);
  }

  async findByUserId(userId: string): Promise<OrderDetails[]> {
    return this.findAll({ userId });
  }

  private async list(filters: OrderFilters = {}, orderId?: number, connection: Pool | PoolClient = this.pool): Promise<OrderDetails[]> {
    const conditions: string[] = [];
    const values: Array<string | number> = [];
    if (orderId !== undefined) {
      values.push(orderId);
      conditions.push(`o.id = $${values.length}`);
    }
    if (filters.userId !== undefined) {
      values.push(filters.userId);
      conditions.push(`o.user_id = $${values.length}`);
    }
    if (filters.status !== undefined) {
      values.push(filters.status);
      conditions.push(`s.name = $${values.length}`);
    }
    const result = await connection.query<ListedOrderRow>(
      `SELECT o.id, o.user_id, o.created_at, o.updated_at, o.picked_up_at, u.full_name, s.name AS status,
         i.id AS item_id, i.product_id, i.name, i.quantity, i.price
       FROM orders o
       JOIN order_statuses s ON s.id = o.status_id
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items i ON i.order_id = o.id
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY o.created_at DESC, o.id DESC, i.id ASC`,
      values,
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
    return [...orders.values()].map(({ row, items }) => ({
      user: { id: row.user_id, fullName: row.full_name },
      order: new Order({
      id: row.id,
      userId: row.user_id,
      status: row.status,
      items,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pickedUpAt: row.picked_up_at,
    }) }));
  }

  async updateStatus(id: number, statusId: number): Promise<OrderDetails> {
    const client = await this.pool.connect();
    let discardConnection = false;
    try {
      await client.query('BEGIN');
      const locked = await client.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [id]);
      if (!locked.rows.length) throw new OrderNotFoundError();
      const statusResult = await client.query<{ name: OrderStatus }>(
        'SELECT name FROM order_statuses WHERE id = $1', [statusId],
      );
      const statusRow = statusResult.rows[0];
      if (!statusRow) throw new InvalidOrderStatusError();
      const target = new Status(statusRow.name);
      const details = (await this.list(undefined, id, client))[0];
      if (!details) throw new OrderNotFoundError();
      const { order } = details;
      // Retrying the same status must preserve the original pickup timestamp.
      if (order.status !== target.value) {
        if (!order.orderStatus.canTransitionTo(target)) {
          throw new InvalidOrderError('Apenas pedidos pendentes podem ser cancelados ou retirados.');
        }
        if (target.isPickedUp()) order.markAsPickedUp();
        else order.cancel();
        await client.query(
          `UPDATE orders SET status_id = $2, picked_up_at = $3, updated_at = $4 WHERE id = $1`,
          [id, statusId, order.pickedUpAt, order.updatedAt],
        );
      }
      await client.query('COMMIT');
      return details;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { discardConnection = true; }
      throw error;
    } finally {
      client.release(discardConnection);
    }
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
         RETURNING id, user_id, created_at, updated_at, picked_up_at`,
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
        pickedUpAt: row.picked_up_at,
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
