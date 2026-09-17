import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { productImagesRouter } from '../../src/routes/product-images.js';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
function setup(found = true) {
  const query = vi.fn().mockResolvedValue({ rows: found ? [{ id: 'burger', data: png, mime_type: 'image/png' }] : [] });
  const release = vi.fn();
  const pool = { query, connect: vi.fn().mockResolvedValue({ query, release }) };
  const app = express();
  app.use(productImagesRouter(pool as unknown as Pool));
  return { app, query, release };
}
describe('Product images HTTP', () => {
  it('serves the original bytes with the stored content type', async () => {
    const { app } = setup();
    const response = await request(app).get('/products/burger/images/desktop');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.body).toEqual(png);
  });
  it('returns 404 for a missing image', async () => {
    expect((await request(setup(false).app).get('/products/burger/images/mobile')).status).toBe(404);
  });
  it('rejects invalid variants and content before persistence', async () => {
    const { app, query } = setup();
    expect((await request(app).get('/products/burger/images/other')).status).toBe(400);
    expect((await request(app).put('/products/burger/images/desktop').set('Content-Type', 'image/png').send(Buffer.from('invalid'))).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
  it('stores the image and updates the product timestamp in one transaction', async () => {
    const { app, query, release } = setup();
    const result = await request(app).put('/products/burger/images/mobile').set('Content-Type', 'image/png').send(png);
    expect(result.status).toBe(200);
    expect(result.body.data.url).toBe('/products/burger/images/mobile');
    expect(query.mock.calls[0]?.[0]).toBe('BEGIN');
    expect(query.mock.calls[2]?.[1]).toEqual(['burger', 'mobile', 'burger-mobile', 'image/png', png]);
    expect(query.mock.calls[3]?.[1]).toEqual(['burger']);
    expect(query.mock.calls[4]?.[0]).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });
  it('rolls back if the product does not exist', async () => {
    const { app, query } = setup(false);
    expect((await request(app).put('/products/missing/images/mobile').set('Content-Type', 'image/png').send(png)).status).toBe(404);
    expect(query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });
  it('rolls back and releases the connection on a database failure', async () => {
    const { app, query, release } = setup();
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 'burger' }] }).mockRejectedValueOnce(new Error('failed'));
    expect((await request(app).put('/products/burger/images/mobile').set('Content-Type', 'image/png').send(png)).status).toBe(500);
    expect(query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });
  it('rejects files exceeding 10 MB', async () => {
    const { app, query } = setup();
    expect((await request(app).put('/products/burger/images/mobile').set('Content-Type', 'image/png').send(Buffer.alloc(10 * 1024 * 1024 + 1))).status).toBe(413);
    expect(query).not.toHaveBeenCalled();
  });
  it('removes only the requested image in a transaction', async () => {
    const { app, query, release } = setup();
    expect((await request(app).delete('/products/burger/images/mobile')).status).toBe(204);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM product_images'), ['burger', 'mobile']);
    expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });
  it('returns 404 and rolls back when deleting a missing image', async () => {
    const { app, query } = setup(false);
    expect((await request(app).delete('/products/burger/images/mobile')).status).toBe(404);
    expect(query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });
  it('rolls back an image deletion when updating the timestamp fails', async () => {
    const { app, query, release } = setup();
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 'burger' }] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] }).mockRejectedValueOnce(new Error('failed'));
    expect((await request(app).delete('/products/burger/images/mobile')).status).toBe(500);
    expect(query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });

});
