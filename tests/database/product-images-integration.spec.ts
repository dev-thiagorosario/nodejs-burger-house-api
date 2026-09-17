import express from 'express';
import request from 'supertest';
import { productImagesRouter } from '../../src/routes/product-images.js';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolClient } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { up, down } from '../../src/database/migrations/010-remove-product-image-columns.js';
import { importProductImage } from '../../src/database/product-image-import.js';
import { PostgresProductRepository } from '../../src/postgres-repository/postgres-product-repository.js';
import { CreateProductUseCase } from '../../src/use-case/product/create-product-use-case.js';
import { UpdateProductUseCase } from '../../src/use-case/product/update-product-use-case.js';
import { DeleteProductUseCase } from '../../src/use-case/product/delete-product-use-case.js';
import { GetProductByIdUseCase } from '../../src/use-case/product/get-product-by-id-use-case.js';
import { ListProductsUseCase } from '../../src/use-case/product/list-products-use-case.js';
import { saveProductImage, removeProductImage } from '../../src/services/product-images-service.js';

const connectionString = process.env.TEST_DATABASE_URL;
import * as migration0 from '../../src/database/migrations/001-create-users.js';
import * as migration1 from '../../src/database/migrations/002-add-is-admin-to-users.js';
import * as migration2 from '../../src/database/migrations/003-create-order-statuses.js';
import * as migration3 from '../../src/database/migrations/005-create-product-categories.js';
import * as migration4 from '../../src/database/migrations/004-create-products.js';
import * as migration5 from '../../src/database/migrations/006-create-orders.js';
import * as migration6 from '../../src/database/migrations/007-create-order-items.js';
import * as migration7 from '../../src/database/migrations/008-add-is-active-to-products.js';
import * as migration8 from '../../src/database/migrations/009-create-product-images.js';
const legacyMigrations = [migration0, migration1, migration2, migration3, migration4, migration5, migration6, migration7, migration8];
let source: string;
let mobileSource: string;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

describe.skipIf(!connectionString)('Product images PostgreSQL integration', () => {
  let pool: Pool;
  let admin: Pool;
  let schema: string;
  let fixtureDirectory: string;

  beforeAll(async () => {
    const root = fileURLToPath(new URL('../../storage/assets/', import.meta.url));
    await mkdir(root, { recursive: true });
    fixtureDirectory = await mkdtemp(`${root}image-test-`);
    await writeFile(`${fixtureDirectory}/desktop.png`, png);
    await writeFile(`${fixtureDirectory}/mobile.png`, png);
    source = `/assets/${basename(fixtureDirectory)}/desktop.png`;
    mobileSource = `/assets/${basename(fixtureDirectory)}/mobile.png`;
  });
  afterAll(async () => {
    if (fixtureDirectory) await rm(fixtureDirectory, { recursive: true });
  });

  beforeEach(async () => {
    // Each test owns only its randomly named schema, never public/application tables.
    schema = `image_test_${randomUUID().replaceAll('-', '')}`;
    admin = new Pool({ connectionString });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    for (const migration of legacyMigrations) {
      await transaction(migration.up);
    }
    await pool.query("INSERT INTO product_categories (id, name) VALUES (1, 'Hamburguer')");
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await pool?.end();
    if (schema) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin?.end();
  });

  async function transaction(action: (client: PoolClient) => Promise<void>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await action(client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  async function legacyProduct(id = 'burger', desktop = source, mobile = mobileSource) {
    await pool.query(`INSERT INTO products (id, title, description, image, mobile_image, image_alt, price, category_id)
      VALUES ($1, 'Burger', 'Description', $2, $3, 'Original alt', 10, 1)`, [id, desktop, mobile]);
  }
  async function legacyColumns() {
    const result = await pool.query(`SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'products'
      AND column_name IN ('image', 'mobile_image') ORDER BY column_name`, [schema]);
    return result.rows;
  }

  it('migrates an empty database and restores the exact legacy column definitions', async () => {
    const original = await legacyColumns();
    await transaction(up);
    expect(await legacyColumns()).toEqual([]);
    await transaction(down);
    expect(await legacyColumns()).toEqual(original);
    const checks = await pool.query(`SELECT conname FROM pg_constraint
      WHERE conrelid = 'products'::regclass AND conname IN ('products_image_not_blank', 'products_mobile_image_not_blank')`);
    expect(checks.rows).toHaveLength(2);
    await transaction(up);
  });

  it('imports both legacy files byte-for-byte and preserves products, alt text and timestamps', async () => {
    await legacyProduct();
    const before = (await pool.query('SELECT * FROM products')).rows[0];
    await transaction(up);
    expect(await legacyColumns()).toEqual([]);
    const images = await pool.query('SELECT variant, data FROM product_images ORDER BY variant');
    expect(images.rows.map((image) => image.variant)).toEqual(['desktop', 'mobile']);
    expect(images.rows[0].data.equals(await readFile(new URL(`../../storage${source}`, import.meta.url)))).toBe(true);
    expect(images.rows[1].data.equals(await readFile(new URL(`../../storage${mobileSource}`, import.meta.url)))).toBe(true);
    const { image: _image, mobile_image: _mobile, ...rest } = before;
    expect((await pool.query('SELECT * FROM products')).rows[0]).toEqual(rest);
  });

  it('preserves existing uploads and supports repeated import and down/up without duplicates', async () => {
    await legacyProduct('burger', 'https://old.example/desktop.png', mobileSource);
    await saveProductImage(pool, 'burger', 'desktop', 'uploaded.png', png);
    await transaction(async (client) => {
      await importProductImage(client, 'burger', 'mobile', mobileSource);
      await importProductImage(client, 'burger', 'mobile', mobileSource);
    });
    const before = (await pool.query('SELECT id, product_id, variant, file_name, mime_type, created_at, updated_at, md5(data) AS checksum FROM product_images ORDER BY variant')).rows;
    await transaction(up);
    await transaction(down);
    const restored = (await pool.query('SELECT image, mobile_image FROM products')).rows[0];
    expect(restored).toEqual({ image: '/products/burger/images/desktop', mobile_image: '/products/burger/images/mobile' });
    await expect(pool.query("UPDATE products SET image = ''")).rejects.toMatchObject({ code: '23514' });
    await expect(pool.query('UPDATE products SET mobile_image = NULL')).rejects.toMatchObject({ code: '23502' });
    await transaction(up);
    expect((await pool.query('SELECT id, product_id, variant, file_name, mime_type, created_at, updated_at, md5(data) AS checksum FROM product_images ORDER BY variant')).rows).toEqual(before);
  });

  it.each(['/assets/missing.png', 'https://example.com/missing.png', '/assets/../../package.json'])(
    'rolls back imported bytes and keeps legacy columns when a source is unavailable: %s', async (missing) => {
      await legacyProduct('burger', source, missing);
      await expect(transaction(up)).rejects.toThrow('Não foi possível importar');
      expect(await legacyColumns()).toHaveLength(2);
      expect((await pool.query('SELECT * FROM product_images')).rows).toEqual([]);
      expect((await pool.query('SELECT mobile_image FROM products')).rows[0].mobile_image).toBe(missing);
    },
  );

  it('runs product CRUD, uploads, replacement, deletion and reads without N+1 or binary metadata', async () => {
    await transaction(up);
    const repository = new PostgresProductRepository(pool);
    const create = new CreateProductUseCase(repository);
    const input = { id: 'burger', name: 'Burger', description: '', price: 10, categoryId: 1 };
    expect((await create.execute(input)).images).toEqual([]);
    await create.execute({ ...input, id: 'other' });
    await expect(create.execute(input)).rejects.toThrow();
    expect(await saveProductImage(pool, 'burger', 'desktop', 'first.png', png)).toBe(true);
    await saveProductImage(pool, 'burger', 'mobile', 'mobile.png', png);
    await saveProductImage(pool, 'burger', 'desktop', 'replacement.png', png);
    const query = vi.spyOn(pool, 'query');
    const listed = await new ListProductsUseCase(repository).execute();
    expect(query).toHaveBeenCalledTimes(1);
    query.mockRestore();
    expect(listed).toHaveLength(2);
    expect(listed[0]!.images).toEqual([
      { variant: 'desktop', fileName: 'replacement.png', mimeType: 'image/png', url: '/products/burger/images/desktop' },
      { variant: 'mobile', fileName: 'mobile.png', mimeType: 'image/png', url: '/products/burger/images/mobile' },
    ]);
    expect((await repository.findByCategoryId(1))).toHaveLength(2);
    const updated = await new UpdateProductUseCase(repository).execute({ id: 'burger', price: 12, imageAlt: 'New alt' });
    expect(updated.images).toEqual(listed[0]!.images);
    expect(updated.imageAlt).toBe('New alt');
    await new DeleteProductUseCase(repository).execute('burger');
    expect((await new GetProductByIdUseCase(repository).execute('burger')).isActive).toBe(false);
    expect((await repository.findById('burger'))!.images).toHaveLength(2);
    expect(await removeProductImage(pool, 'burger', 'mobile')).toBe(true);
    expect(await removeProductImage(pool, 'burger', 'mobile')).toBe(false);
    expect((await repository.findById('burger'))!.images).toHaveLength(1);
    await pool.query('DELETE FROM products WHERE id = $1', ['burger']);
    expect((await pool.query('SELECT * FROM product_images')).rows).toEqual([]);
    expect(await saveProductImage(pool, 'missing', 'desktop', 'a.png', png)).toBe(false);
    // Rollback must also work for products created without images in the new schema.
    await transaction(down);
    expect((await pool.query('SELECT image FROM products')).rows[0].image).toBe('/products/other/images/desktop');
  });

  it('rolls back upload and removal if updating the product fails', async () => {
    await legacyProduct();
    await transaction(up);
    const original = (await pool.query('SELECT id, product_id, variant, file_name, mime_type, created_at, updated_at, md5(data) AS checksum FROM product_images ORDER BY variant')).rows;
    await pool.query(`CREATE FUNCTION fail_product_update() RETURNS trigger AS $$ BEGIN
      RAISE EXCEPTION 'simulated persistence failure'; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_update BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fail_product_update()`);
    await expect(saveProductImage(pool, 'burger', 'desktop', 'replacement.png', png)).rejects.toThrow('simulated');
    await expect(removeProductImage(pool, 'burger', 'mobile')).rejects.toThrow('simulated');
    expect((await pool.query('SELECT id, product_id, variant, file_name, mime_type, created_at, updated_at, md5(data) AS checksum FROM product_images ORDER BY variant')).rows).toEqual(original);
  });

  it('rolls back product creation when its seed image import fails', async () => {
    await transaction(up);
    await expect(transaction(async (client) => {
      await client.query(`INSERT INTO products (id, title, description, price, category_id) VALUES ('new', 'New', '', 10, 1)`);
      await importProductImage(client, 'new', 'desktop', source);
      await importProductImage(client, 'new', 'mobile', '/assets/missing.png');
    })).rejects.toThrow('Não foi possível importar');
    expect((await pool.query('SELECT * FROM products')).rows).toEqual([]);
    expect((await pool.query('SELECT * FROM product_images')).rows).toEqual([]);
  });
  it('serves uploaded bytes over HTTP and stops serving them after removal', async () => {
    await transaction(up);
    const repository = new PostgresProductRepository(pool);
    await new CreateProductUseCase(repository).execute({ id: 'burger', name: 'Burger', description: '', price: 10, categoryId: 1 });
    const app = express();
    app.use(productImagesRouter(pool));
    const uploaded = await request(app).put('/products/burger/images/desktop')
      .set('Content-Type', 'image/png').set('X-File-Name', 'photo.png').send(png);
    expect(uploaded.status).toBe(200);
    expect(uploaded.body.data).toEqual({ variant: 'desktop', fileName: 'photo.png', mimeType: 'image/png', url: '/products/burger/images/desktop' });
    const downloaded = await request(app).get(uploaded.body.data.url);
    expect(downloaded.status).toBe(200);
    expect(downloaded.body.equals(png)).toBe(true);
    expect((await request(app).delete(uploaded.body.data.url)).status).toBe(204);
    expect((await request(app).get(uploaded.body.data.url)).status).toBe(404);
    expect((await repository.findById('burger'))!.images).toEqual([]);
  });

  it('serializes concurrent uploads without duplicate variants or partial metadata', async () => {
    await transaction(up);
    const repository = new PostgresProductRepository(pool);
    await new CreateProductUseCase(repository).execute({ id: 'burger', name: 'Burger', description: '', price: 10, categoryId: 1 });
    expect(await Promise.all([
      saveProductImage(pool, 'burger', 'desktop', 'first.png', png),
      saveProductImage(pool, 'burger', 'desktop', 'second.png', png),
    ])).toEqual([true, true]);
    const images = (await repository.findById('burger'))!.images;
    expect(images).toHaveLength(1);
    expect(['first.png', 'second.png']).toContain(images[0]!.fileName);
  });

});
