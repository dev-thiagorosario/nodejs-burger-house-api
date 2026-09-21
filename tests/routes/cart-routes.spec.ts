import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Product, type ProductProps } from '../../src/entities/product-entity.js';
import apiRouter from '../../src/routes/api.js';

const repository = vi.hoisted(() => ({
  findByIds: vi.fn(), findById: vi.fn(), findAll: vi.fn(), findByCategoryId: vi.fn(),
  create: vi.fn(), update: vi.fn(),
}));
vi.mock('../../src/core/config.js', () => ({ databaseUrl: 'unused', jwtSecret: 'test-secret' }));
vi.mock('../../src/database/data-source.js', () => ({ createPostgresPool: () => ({ end: vi.fn() }) }));
vi.mock('../../src/postgres-repository/postgres-product-repository.js', () => ({
  PostgresProductRepository: class {
    findByIds = repository.findByIds;
    findById = repository.findById;
    findAll = repository.findAll;
    findByCategoryId = repository.findByCategoryId;
    create = repository.create;
    update = repository.update;
  },
}));

const app = express();
app.use(express.json());
app.use(apiRouter);
app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
});

const item = { productId: 'duplo-da-casa', quantity: 2 };

function product(props: Partial<ProductProps> = {}) {
  const date = new Date('2026-09-01T12:00:00Z');
  return new Product({
    id: item.productId, name: 'Duplo da Casa', description: 'Carne e queijo',
    price: 29.9, categoryId: 1, createdAt: date, updatedAt: date, ...props,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  repository.findByIds.mockResolvedValue([]);
});

afterEach(() => {
  expect(repository.findById).not.toHaveBeenCalled();
  expect(repository.findAll).not.toHaveBeenCalled();
  expect(repository.findByCategoryId).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
  expect(repository.update).not.toHaveBeenCalled();
});

describe('POST /cart/summary', () => {
  it('returns the existing success envelope with one product and normalizes its ID', async () => {
    repository.findByIds.mockResolvedValue([product()]);

    const response = await request(app).post('/cart/summary').send({
      items: [{ productId: ' duplo-da-casa ', quantity: 2 }],
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        items: [{ productId: item.productId, name: 'Duplo da Casa', unitPrice: 29.9, quantity: 2, subtotal: 59.8 }],
        totalItems: 2,
        total: 59.8,
      },
    });
    expect(repository.findByIds).toHaveBeenCalledExactlyOnceWith([item.productId]);
  });

  it('returns correct subtotals and totals for several products', async () => {
    repository.findByIds.mockResolvedValue([
      product({ id: 'batata-frita', name: 'Batata Frita', price: 14.9, categoryId: 3 }),
      product(),
    ]);

    const response = await request(app).post('/cart/summary').send({
      items: [item, { productId: 'batata-frita', quantity: 1 }],
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        items: [
          { productId: item.productId, name: 'Duplo da Casa', unitPrice: 29.9, quantity: 2, subtotal: 59.8 },
          { productId: 'batata-frita', name: 'Batata Frita', unitPrice: 14.9, quantity: 1, subtotal: 14.9 },
        ],
        totalItems: 3,
        total: 74.7,
      },
    });
    expect(repository.findByIds).toHaveBeenCalledExactlyOnceWith([item.productId, 'batata-frita']);
  });

  it.each([
    {}, { items: null }, { items: {} }, { items: 'products' }, { items: [] },
    { items: [null] }, { items: ['duplo-da-casa'] }, { items: [{}] },
    { items: [{ quantity: 1 }] }, { items: [{ productId: 123, quantity: 1 }] },
    { items: [{ productId: null, quantity: 1 }] }, { items: [{ productId: '', quantity: 1 }] },
    { items: [{ productId: ' ', quantity: 1 }] }, { items: [{ productId: 'INVALID ID', quantity: 1 }] },
    { items: [{ productId: 'a'.repeat(256), quantity: 1 }] },
    { items: [{ productId: item.productId }] },
    { items: [{ ...item, quantity: 0 }] }, { items: [{ ...item, quantity: -1 }] },
    { items: [{ ...item, quantity: 1.5 }] }, { items: [{ ...item, quantity: '2' }] },
    { items: [{ ...item, quantity: null }] }, { items: [{ ...item, quantity: true }] },
    { items: [{ ...item, quantity: Number.MAX_SAFE_INTEGER + 1 }] },
  ])('rejects invalid request %j before querying products', async (body) => {
    const response = await request(app).post('/cart/summary').send(body);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'Nome enviado pelo frontend' }, { price: 0.01 }, { unitPrice: 0.01 },
    { subtotal: 0.02 }, { total: 0.02 }, { image: '/fake.png' },
    { images: [] }, { category: 'burger' }, { categoryId: 1 },
  ])('rejects extra product data %j before querying products', async (fields) => {
    const response = await request(app).post('/cart/summary').send({ items: [{ ...item, ...fields }] });

    expect(response.status).toBe(400);
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });

  it.each([{ total: 0.02 }, { totalItems: 1 }, { userId: 'another-user' }])(
    'rejects extra body fields %j before querying products', async (fields) => {
      const response = await request(app).post('/cart/summary').send({ items: [item], ...fields });

      expect(response.status).toBe(400);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(repository.findByIds).not.toHaveBeenCalled();
    },
  );

  it('returns 404 when a requested product does not exist', async () => {
    repository.findByIds.mockResolvedValue([product()]);

    const response = await request(app).post('/cart/summary').send({
      items: [item, { productId: 'missing-product', quantity: 1 }],
    });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('returns 409 when a product is inactive and unavailable for purchase', async () => {
    repository.findByIds.mockResolvedValue([product({ isActive: false })]);

    const response = await request(app).post('/cart/summary').send({ items: [item] });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ success: false, message: 'Produto indisponível para compra.' });
  });

  it('returns 400 when the cart cannot be calculated within the safe integer range', async () => {
    repository.findByIds.mockResolvedValue([product()]);

    const response = await request(app).post('/cart/summary').send({
      items: [{ ...item, quantity: Number.MAX_SAFE_INTEGER }],
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(repository.findByIds).toHaveBeenCalledOnce();
  });

  it('forwards unexpected repository errors to the existing error middleware', async () => {
    repository.findByIds.mockRejectedValue(new Error('database unavailable'));

    const response = await request(app).post('/cart/summary').send({ items: [item] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Erro interno do servidor.' });
  });
});
