import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Order } from '../../src/entities/order-entity.js';
import { Product, type ProductProps } from '../../src/entities/product-entity.js';
import { User } from '../../src/entities/user-entity.js';
import { InvalidOrderError } from '../../src/entities/order-entity.js';
import { OrderNotFoundError } from '../../src/exception/order-not-found-error.js';
import { InvalidOrderStatusError } from '../../src/value-object/order-status-value-object.js';
import { JwtTokenProvider } from '../../src/providers/jwt-token-provider.js';
import type { CreateOrderData } from '../../src/repository/i-order-repository.js';
import apiRouter from '../../src/routes/api.js';

const repositories = vi.hoisted(() => ({
  findUserById: vi.fn(), findProductsByIds: vi.fn(), createOrder: vi.fn(),
  findAllOrders: vi.fn(), findOrdersByUserId: vi.fn(), updateOrderStatus: vi.fn(),
}));
const pool = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));

vi.mock('../../src/core/config.js', () => ({ databaseUrl: 'unused', jwtSecret: 'test-secret' }));
vi.mock('../../src/database/data-source.js', () => ({ createPostgresPool: () => pool }));
vi.mock('../../src/postgres-repository/postgres-user-repository.js', () => ({
  PostgresUserRepository: class { findById = repositories.findUserById; },
}));
vi.mock('../../src/postgres-repository/postgres-product-repository.js', () => ({
  PostgresProductRepository: class { findByIds = repositories.findProductsByIds; },
}));
vi.mock('../../src/postgres-repository/postgres-order-repository.js', () => ({
  PostgresOrderRepository: class {
    create = repositories.createOrder;
    updateStatus = repositories.updateOrderStatus;
    findAll = repositories.findAllOrders;
    findByUserId = repositories.findOrdersByUserId;
  },
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(apiRouter);
app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
});

const userId = '11111111-1111-4111-8111-111111111111';
const date = new Date('2026-09-01T12:00:00Z');
const updatedAt = new Date('2026-09-01T12:00:01Z');
const authCookie = `access_token=${new JwtTokenProvider('test-secret').generate(userId)}`;
const item = { productId: 'duplo-da-casa', quantity: 2 };

function product(props: Partial<ProductProps> = {}) {
  return new Product({
    id: item.productId, name: 'Duplo da Casa', description: 'Carne e queijo',
    price: 29.9, categoryId: 1, createdAt: date, updatedAt: date, ...props,
  });
}

function createOrder(body: object) {
  return request(app).post('/create-order').set('Cookie', authCookie).send(body);
}

beforeEach(() => {
  vi.resetAllMocks();
  repositories.findUserById.mockResolvedValue(new User({
    id: userId, fullName: 'Cliente Teste', email: 'cliente@example.com', passwordHash: 'hash',
    cep: '40000-000', createdAt: date, updatedAt: date,
  }));
  repositories.findProductsByIds.mockResolvedValue([product()]);
  repositories.createOrder.mockImplementation(async (data: CreateOrderData) => new Order({
    id: 42, userId: data.userId, status: 'pending',
    items: data.items.map((orderItem, index) => ({ ...orderItem, id: 101 + index })),
    createdAt: date, updatedAt,
  }));
});

describe('POST /create-order', () => {
  it('creates a pending order using the authenticated user and current database product data', async () => {
    const response = await createOrder({ items: [{ ...item, productId: ' duplo-da-casa ' }] });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: 'Pedido criado com sucesso.',
      data: {
        order: {
          id: 42, userId, status: 'pending',
          items: [{ id: 101, productId: item.productId, name: 'Duplo da Casa', unitPrice: 29.9, quantity: 2, subtotal: 59.8 }],
          pickedUpAt: null, totalItems: 2, total: 59.8, createdAt: date.toISOString(), updatedAt: updatedAt.toISOString(),
        },
      },
    });
    expect(repositories.findUserById).toHaveBeenCalledExactlyOnceWith(userId);
    expect(repositories.findProductsByIds).toHaveBeenCalledExactlyOnceWith([item.productId]);
    expect(repositories.createOrder).toHaveBeenCalledExactlyOnceWith({
      userId,
      items: [{ productId: item.productId, productName: 'Duplo da Casa', quantity: 2, unitPrice: 29.9 }],
    });
  });

  it('combines repeated products and calculates totals independently of the database return order', async () => {
    repositories.findProductsByIds.mockResolvedValue([
      product({ id: 'batata-frita', name: 'Batata Frita', price: 14.9, categoryId: 3 }),
      product(),
    ]);

    const response = await createOrder({ items: [
      item, { productId: 'batata-frita', quantity: 1 },
      { productId: ' duplo-da-casa ', quantity: 1 },
    ] });

    expect(response.status).toBe(201);
    expect(response.body.data.order.items).toEqual([
      { id: 101, productId: item.productId, name: 'Duplo da Casa', unitPrice: 29.9, quantity: 3, subtotal: 89.7 },
      { id: 102, productId: 'batata-frita', name: 'Batata Frita', unitPrice: 14.9, quantity: 1, subtotal: 14.9 },
    ]);
    expect(response.body.data.order.totalItems).toBe(4);
    expect(response.body.data.order.total).toBe(104.6);
    expect(repositories.findProductsByIds).toHaveBeenCalledExactlyOnceWith([item.productId, 'batata-frita']);
    expect(repositories.createOrder).toHaveBeenCalledExactlyOnceWith({
      userId,
      items: [
        { productId: item.productId, productName: 'Duplo da Casa', quantity: 3, unitPrice: 29.9 },
        { productId: 'batata-frita', productName: 'Batata Frita', quantity: 1, unitPrice: 14.9 },
      ],
    });
  });

  it('accepts the largest database integer quantity when the monetary total is supported', async () => {
    repositories.findProductsByIds.mockResolvedValue([product({ price: 0.01 })]);

    const response = await createOrder({ items: [{ ...item, quantity: 2_147_483_647 }] });

    expect(response.status).toBe(201);
    expect(response.body.data.order.items[0].quantity).toBe(2_147_483_647);
    expect(response.body.data.order.total).toBe(21_474_836.47);
    expect(repositories.createOrder).toHaveBeenCalledOnce();
  });

  it.each([undefined, 'access_token=invalid', `access_token=${new JwtTokenProvider('wrong-secret').generate(userId)}`])(
    'rejects unauthenticated requests before accessing repositories (%s)', async (cookie) => {
      const req = request(app).post('/create-order');
      if (cookie) req.set('Cookie', cookie);

      const response = await req.send({ items: [item] });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(repositories.findUserById).not.toHaveBeenCalled();
      expect(repositories.findProductsByIds).not.toHaveBeenCalled();
      expect(repositories.createOrder).not.toHaveBeenCalled();
    },
  );

  it.each([
    {}, { items: null }, { items: {} }, { items: 'products' }, { items: [] },
    { items: [null] }, { items: ['duplo-da-casa'] }, { items: [{}] },
    { items: [{ quantity: 1 }] }, { items: [{ productId: 123, quantity: 1 }] },
    { items: [{ productId: '', quantity: 1 }] }, { items: [{ productId: ' ', quantity: 1 }] },
    { items: [{ productId: 'INVALID ID', quantity: 1 }] },
    { items: [{ productId: 'a'.repeat(256), quantity: 1 }] },
    { items: [{ productId: item.productId }] },
    { items: [{ ...item, quantity: 0 }] }, { items: [{ ...item, quantity: -1 }] },
    { items: [{ ...item, quantity: 1.5 }] }, { items: [{ ...item, quantity: '2' }] },
    { items: [{ ...item, quantity: null }] }, { items: [{ ...item, quantity: true }] },
    { items: [{ ...item, quantity: 2_147_483_648 }] },
  ])('rejects an invalid cart before reading products or writing an order: %j', async (body) => {
    const response = await createOrder(body);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(repositories.findProductsByIds).not.toHaveBeenCalled();
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it.each([
    { userId: '22222222-2222-4222-8222-222222222222' }, { status: 'picked_up' },
    { statusId: 2 }, { price: 0.01 }, { total: 0.01 }, { totalItems: 1 },
  ])('rejects client-controlled order fields: %j', async (fields) => {
    const response = await createOrder({ items: [item], ...fields });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(repositories.findProductsByIds).not.toHaveBeenCalled();
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'Nome enviado pelo cliente' }, { productName: 'Nome enviado pelo cliente' },
    { price: 0.01 }, { unitPrice: 0.01 }, { subtotal: 0.02 },
  ])('rejects client-controlled product fields: %j', async (fields) => {
    const response = await createOrder({ items: [{ ...item, ...fields }] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(repositories.findProductsByIds).not.toHaveBeenCalled();
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it('rejects duplicate quantities whose sum exceeds the database integer limit', async () => {
    const response = await createOrder({ items: [
      { ...item, quantity: 2_147_483_647 }, { ...item, quantity: 1 },
    ] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it('does not persist an order if any requested product is missing', async () => {
    const response = await createOrder({ items: [item, { productId: 'missing-product', quantity: 1 }] });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it('does not persist an order if a product is inactive', async () => {
    repositories.findProductsByIds.mockResolvedValue([product({ isActive: false })]);

    const response = await createOrder({ items: [item] });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ success: false, message: 'Produto indisponível para compra.' });
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it('does not persist an order if the authenticated user no longer exists', async () => {
    repositories.findUserById.mockResolvedValue(null);

    const response = await createOrder({ items: [item] });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it.each(['findUserById', 'findProductsByIds', 'createOrder'] as const)(
    'forwards unexpected %s failures to the error middleware', async (method) => {
      repositories[method].mockRejectedValue(new Error('database unavailable'));

      const response = await createOrder({ items: [item] });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ success: false, message: 'Erro interno do servidor.' });
      if (method !== 'createOrder') expect(repositories.createOrder).not.toHaveBeenCalled();
    },
  );
});

describe('GET /list-order-statuses', () => {
  it('returns status IDs and names from the database without requiring authentication', async () => {
    const statuses = [
      { id: 7, name: 'pending' }, { id: 9, name: 'cancelled' }, { id: 11, name: 'picked_up' },
    ];
    pool.query.mockResolvedValue({ rows: statuses });

    const response = await request(app).get('/list-order-statuses');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { statuses } });
    expect(pool.query).toHaveBeenCalledExactlyOnceWith('SELECT id, name FROM order_statuses ORDER BY id');
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it('returns an empty list when no statuses are registered', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const response = await request(app).get('/list-order-statuses');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { statuses: [] } });
  });

  it('forwards database failures to the error middleware', async () => {
    pool.query.mockRejectedValue(new Error('database unavailable'));

    const response = await request(app).get('/list-order-statuses');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Erro interno do servidor.' });
  });
});

describe('PATCH /update-order-status/:id', () => {
  const pickup = new Date('2026-09-02T12:00:00Z');
  const details = {
    user: { id: userId, fullName: 'Cliente Teste' },
    order: new Order({ id: 42, userId, status: 'pickedUp', pickedUpAt: pickup,
      createdAt: date, updatedAt: pickup,
      items: [{ id: 101, productId: item.productId, productName: 'Burger', unitPrice: 20, quantity: 2 }],
    }),
  };

  beforeEach(() => {
    repositories.findUserById.mockResolvedValue({ id: userId, isAdmin: true });
    repositories.updateOrderStatus.mockResolvedValue(details);
  });

  it('updates using the dropdown ID and returns customer and pickup time', async () => {
    const response = await request(app).patch('/update-order-status/42').set('Cookie', authCookie).send({ statusId: 17 });
    expect(response.status).toBe(200);
    expect(repositories.updateOrderStatus).toHaveBeenCalledExactlyOnceWith(42, 17);
    expect(response.body.data.order).toMatchObject({ id: 42, status: 'pickedUp',
      pickedUpAt: pickup.toISOString(), user: details.user, total: 40,
    });
  });

  it('requires authentication', async () => {
    const response = await request(app).patch('/update-order-status/42').send({ statusId: 17 });
    expect(response.status).toBe(401);
    expect(repositories.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('denies customer updates, even for their own orders', async () => {
    repositories.findUserById.mockResolvedValue({ id: userId, isAdmin: false });
    const response = await request(app).patch('/update-order-status/42').set('Cookie', authCookie).send({ statusId: 17 });
    expect(response.status).toBe(403);
    expect(repositories.updateOrderStatus).not.toHaveBeenCalled();
  });

  it.each([{}, { statusId: '2' }, { statusId: 0 }, { statusId: 1.5 }, { statusId: 32768 },
    { statusId: 2, pickedUpAt: '2026-01-01' }, { statusId: 2, isAdmin: true }, { status: 'pickedUp' },
  ])('rejects invalid or client-controlled fields: %j', async body => {
    const response = await request(app).patch('/update-order-status/42').set('Cookie', authCookie).send(body);
    expect(response.status).toBe(400);
    expect(repositories.updateOrderStatus).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5', '2147483648'])('rejects invalid order ID %s', async id => {
    const response = await request(app).patch(`/update-order-status/${id}`).set('Cookie', authCookie).send({ statusId: 2 });
    expect(response.status).toBe(400);
    expect(repositories.updateOrderStatus).not.toHaveBeenCalled();
  });

  it.each([
    [new OrderNotFoundError(), 404], [new InvalidOrderStatusError(), 400],
    [new InvalidOrderError('Transição inválida.'), 409], [new Error('database failed'), 500],
  ])('maps repository failure to HTTP %s %s', async (error, status) => {
    repositories.updateOrderStatus.mockRejectedValue(error);
    const response = await request(app).patch('/update-order-status/42').set('Cookie', authCookie).send({ statusId: 2 });
    expect(response.status).toBe(status);
  });

  it('lists persisted pickup time separately from the last update', async () => {
    repositories.findAllOrders.mockResolvedValue([details]);
    const response = await request(app).get('/list-orders').set('Cookie', authCookie);
    expect(response.status).toBe(200);
    expect(response.body.data.orders[0]).toMatchObject({ user: details.user, pickedUpAt: pickup.toISOString() });
  });
});

describe('GET /list-orders', () => {
  const savedOrder = new Order({
    id: 42, userId, status: 'cancelled', createdAt: date, updatedAt,
    items: [{ id: 101, productId: item.productId, productName: 'Nome na compra', quantity: 2, unitPrice: 20.1 }],
  });

  it('lists only the authenticated customer orders with saved items, status and totals', async () => {
    repositories.findOrdersByUserId.mockResolvedValue([{ order: savedOrder, user: { id: userId, fullName: 'Cliente Teste' } }]);
    const response = await request(app).get('/list-orders').set('Cookie', authCookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { orders: [{
      id: 42, userId, status: 'cancelled', createdAt: date.toISOString(), updatedAt: updatedAt.toISOString(),
      items: [{ id: 101, productId: item.productId, name: 'Nome na compra', quantity: 2, unitPrice: 20.1, subtotal: 40.2 }],
      totalItems: 2, total: 40.2, pickedUpAt: null, user: { id: userId, fullName: 'Cliente Teste' },
    }] } });
    expect(repositories.findOrdersByUserId).toHaveBeenCalledExactlyOnceWith(userId);
    expect(repositories.findAllOrders).not.toHaveBeenCalled();
    expect(repositories.findProductsByIds).not.toHaveBeenCalled();
    expect(repositories.createOrder).not.toHaveBeenCalled();
  });

  it('uses the database administrator flag to list all orders', async () => {
    repositories.findUserById.mockResolvedValue({ id: userId, isAdmin: true });
    repositories.findAllOrders.mockResolvedValue([{ order: savedOrder, user: { id: userId, fullName: 'Cliente Teste' } }]);
    const response = await request(app).get('/list-orders').set('Cookie', authCookie);
    expect(response.status).toBe(200);
    expect(response.body.data.orders).toHaveLength(1);
    expect(repositories.findAllOrders).toHaveBeenCalledExactlyOnceWith();
    expect(repositories.findOrdersByUserId).not.toHaveBeenCalled();
  });

  it('returns an empty list for a customer without orders', async () => {
    repositories.findOrdersByUserId.mockResolvedValue([]);
    const response = await request(app).get('/list-orders').set('Cookie', authCookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { orders: [] } });
  });

  it.each([undefined, 'access_token=invalid'])('requires a valid session (%s)', async (cookie) => {
    const req = request(app).get('/list-orders');
    if (cookie) req.set('Cookie', cookie);
    const response = await req;
    expect(response.status).toBe(401);
    expect(repositories.findUserById).not.toHaveBeenCalled();
    expect(repositories.findAllOrders).not.toHaveBeenCalled();
    expect(repositories.findOrdersByUserId).not.toHaveBeenCalled();
  });

  it.each(['userId=another-user', 'isAdmin=true'])('rejects client overrides: %s', async (query) => {
    const response = await request(app).get(`/list-orders?${query}`).set('Cookie', authCookie);
    expect(response.status).toBe(400);
    expect(repositories.findAllOrders).not.toHaveBeenCalled();
    expect(repositories.findOrdersByUserId).not.toHaveBeenCalled();
  });

  it('rejects sessions for a deleted user', async () => {
    repositories.findUserById.mockResolvedValue(null);
    const response = await request(app).get('/list-orders').set('Cookie', authCookie);
    expect(response.status).toBe(404);
    expect(repositories.findAllOrders).not.toHaveBeenCalled();
    expect(repositories.findOrdersByUserId).not.toHaveBeenCalled();
  });

  it('forwards read failures to the error middleware', async () => {
    repositories.findOrdersByUserId.mockRejectedValue(new Error('database unavailable'));
    const response = await request(app).get('/list-orders').set('Cookie', authCookie);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Erro interno do servidor.' });
  });
});
