import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Product } from '../../src/entities/product-entity.js';
import apiRouter from '../../src/routes/api.js';

const repository = vi.hoisted(() => ({
  findById: vi.fn(), findAll: vi.fn(), findByCategoryId: vi.fn(),
  create: vi.fn(), update: vi.fn(),
}));
vi.mock('../../src/core/config.js', () => ({ databaseUrl: 'unused', jwtSecret: 'test-secret' }));
vi.mock('../../src/database/data-source.js', () => ({ createPostgresPool: () => ({ end: vi.fn() }) }));
vi.mock('../../src/postgres-repository/postgres-product-repository.js', () => ({
  PostgresProductRepository: class {
    findById = repository.findById;
    findAll = repository.findAll;
    findByCategoryId = repository.findByCategoryId;
    create = repository.create;
    update = repository.update;
  },
}));

const input = {
  id: 'classic-burger', name: 'Classic Burger', description: 'Carne e queijo',
  price: 25.9, categoryId: 1,
};
const app = express();
app.use(express.json());
app.use(apiRouter);
app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
});

beforeEach(() => {
  vi.resetAllMocks();
  repository.findById.mockResolvedValue(null);
  repository.findAll.mockResolvedValue([]);
  repository.findByCategoryId.mockResolvedValue([]);
  repository.create.mockImplementation(async (product: Product) => product);
  repository.update.mockImplementation(async (product: Product) => product);
});

function existingProduct() {
  const product = new Product({ ...input, createdAt: new Date(), updatedAt: new Date() });
  repository.findById.mockResolvedValue(product);
  return product;
}

describe('Product HTTP routes', () => {
  it('creates and normalizes a product with defaults and timestamps', async () => {
    const response = await request(app).post('/register-product').send({ ...input, name: ' Classic Burger ' });
    expect(response.status).toBe(201);
    expect(response.body.data.product).toMatchObject({ ...input, images: [], imageAlt: input.name, isActive: true });
    expect(response.body.data.product.createdAt).toEqual(expect.any(String));
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it.each([
    { price: '25.90' }, { price: -1 }, { price: 1.001 }, { price: 100_000_000 },
    { categoryId: 4 }, { categoryId: '1' }, { id: 'Invalid ID' }, { name: ' ' },
    { name: 'a'.repeat(256) }, { imageUrl: '/old.png' }, { mobileImageUrl: '/old-mobile.png' }, { images: [] },
    { description: null }, { isActive: 'false' }, { createdAt: '2026-01-01' },
  ])('rejects invalid creation fields %j before persistence', async (fields) => {
    const response = await request(app).post('/register-product').send({ ...input, ...fields });
    expect(response.status).toBe(400);
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns 409 for an existing ID', async () => {
    existingProduct();
    expect((await request(app).post('/register-product').send(input)).status).toBe(409);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('lists products, supports an empty list and converts category query strings', async () => {
    expect((await request(app).get('/list-products')).body.data.products).toEqual([]);
    const product = existingProduct();
    repository.findByCategoryId.mockResolvedValue([product]);
    const response = await request(app).get('/list-products?categoryId=1');
    expect(response.status).toBe(200);
    expect(response.body.data.products).toHaveLength(1);
    expect(repository.findByCategoryId).toHaveBeenCalledWith(1);
    expect(repository.findAll).toHaveBeenCalledOnce();
  });

  it.each(['categoryId=0', 'categoryId=', 'categoryId=1&categoryId=2', 'categoryId[x]=1', 'unknown=1'])('rejects invalid query %s', async (query) => {
    expect((await request(app).get(`/list-products?${query}`)).status).toBe(400);
    expect(repository.findAll).not.toHaveBeenCalled();
    expect(repository.findByCategoryId).not.toHaveBeenCalled();
  });

  it('gets a product by ID', async () => {
    existingProduct();
    const response = await request(app).get('/list-product/classic-burger');
    expect(response.status).toBe(200);
    expect(response.body.data.product).toMatchObject(input);
  });

  it('updates only supplied fields, preserving zero and false', async () => {
    existingProduct();
    const response = await request(app).patch('/update-products/classic-burger').send({ price: 0, isActive: false });
    expect(response.status).toBe(200);
    expect(response.body.data.product).toMatchObject({ ...input, price: 0, isActive: false });
    expect(repository.update).toHaveBeenCalledOnce();
  });

  it.each([{}, { imageUrl: '/old.png' }, { mobileImageUrl: '/old-mobile.png' }, { images: [] }, { id: 'another-id' }, { updatedAt: '2026-01-01' }, { price: null }, { price: 1.001 }])('rejects invalid updates %j', async (body) => {
    expect((await request(app).patch('/update-products/classic-burger').send(body)).status).toBe(400);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('deactivates the product and returns 204 without a body', async () => {
    const product = existingProduct();
    const response = await request(app).delete('/delete-products/classic-burger');
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(product.isActive).toBe(false);
    expect(repository.update).toHaveBeenCalledWith(product);
  });

  it.each(['get', 'patch', 'delete'] as const)('returns 404 for missing products on %s', async (method) => {
    const response = await request(app)[method](`/${{ get: 'list-product', patch: 'update-products', delete: 'delete-products' }[method]}/missing`).send({ name: 'New name' });
    expect(response.status).toBe(404);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)('validates route params on %s', async (method) => {
    const response = await request(app)[method](`/${{ get: 'list-product', patch: 'update-products', delete: 'delete-products' }[method]}/INVALID`).send({ name: 'New name' });
    expect(response.status).toBe(400);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it.each(['post', 'get', 'patch', 'delete'] as const)('forwards unexpected %s errors to the middleware', async (method) => {
    repository.findById.mockRejectedValue(new Error('database unavailable'));
    const response = await request(app)[method](method === 'post' ? '/register-product' : `/${{ get: 'list-product', patch: 'update-products', delete: 'delete-products' }[method]}/classic-burger`)
      .send(method === 'post' ? input : { name: 'New name' });
    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Erro interno do servidor.');
  });

  it('forwards unexpected list errors to the middleware', async () => {
    repository.findAll.mockRejectedValue(new Error('database unavailable'));
    expect((await request(app).get('/list-products')).status).toBe(500);
  });
});
