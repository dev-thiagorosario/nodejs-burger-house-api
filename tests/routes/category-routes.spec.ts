import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiRouter from '../../src/routes/api.js';

const pool = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));
vi.mock('../../src/core/config.js', () => ({ databaseUrl: 'unused', jwtSecret: 'test-secret' }));
vi.mock('../../src/database/data-source.js', () => ({ createPostgresPool: () => pool }));

const app = express();
app.use(apiRouter);
app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
});

beforeEach(() => vi.resetAllMocks());

describe('Category HTTP routes', () => {
  it('returns category IDs and names from the database for the dropdown', async () => {
    const categories = [
      { id: 1, name: 'Hamburguer' },
      { id: 2, name: 'Porcoes' },
      { id: 3, name: 'Bebidas' },
    ];
    pool.query.mockResolvedValue({ rows: categories });

    const response = await request(app).get('/list-categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { categories } });
    expect(pool.query).toHaveBeenCalledExactlyOnceWith(
      'SELECT id, name FROM product_categories ORDER BY id',
    );
  });

  it('returns an empty list when no categories exist', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const response = await request(app).get('/list-categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { categories: [] } });
  });

  it('forwards database failures to the error middleware', async () => {
    pool.query.mockRejectedValue(new Error('database unavailable'));

    const response = await request(app).get('/list-categories');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Erro interno do servidor.' });
  });
});
