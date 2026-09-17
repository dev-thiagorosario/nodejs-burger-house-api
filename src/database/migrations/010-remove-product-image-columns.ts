import type { PoolClient } from 'pg';
import { productImageUrl } from '../../entities/product-image.js';
import { importProductImage } from '../product-image-import.js';

export const id = '010-remove-product-image-columns';

// Both directions require a caller-owned transaction (the runner wraps up).
export async function up(client: PoolClient): Promise<void> {
  await client.query('LOCK TABLE products, product_images IN ACCESS EXCLUSIVE MODE');
  const products = await client.query<{ id: string; image: string; mobile_image: string }>(
    'SELECT id, image, mobile_image FROM products ORDER BY id',
  );
  for (const product of products.rows) {
    await importProductImage(client, product.id, 'desktop', product.image);
    await importProductImage(client, product.id, 'mobile', product.mobile_image);
  }
  const missing = await client.query(`SELECT p.id FROM products p
    CROSS JOIN (VALUES ('desktop'), ('mobile')) AS versions(variant)
    LEFT JOIN product_images i ON i.product_id = p.id AND i.variant = versions.variant
    WHERE i.id IS NULL LIMIT 1`);
  if (missing.rows.length) throw new Error('Existem produtos com imagens pendentes de importação.');
  await client.query('ALTER TABLE products DROP COLUMN image, DROP COLUMN mobile_image');
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('LOCK TABLE products, product_images IN ACCESS EXCLUSIVE MODE');
  await client.query('ALTER TABLE products ADD COLUMN image text, ADD COLUMN mobile_image text');
  const products = await client.query<{ id: string }>('SELECT id FROM products');
  // Restore the former URL contract, including products awaiting their first upload.
  // Image bytes remain in product_images; old filesystem paths cannot be reconstructed.
  for (const product of products.rows) {
    await client.query('UPDATE products SET image = $2, mobile_image = $3 WHERE id = $1',
      [product.id, productImageUrl(product.id, 'desktop'), productImageUrl(product.id, 'mobile')]);
  }
  await client.query(`ALTER TABLE products
    ALTER COLUMN image SET NOT NULL,
    ALTER COLUMN mobile_image SET NOT NULL,
    ADD CONSTRAINT products_image_not_blank CHECK (length(trim(image)) > 0),
    ADD CONSTRAINT products_mobile_image_not_blank CHECK (length(trim(mobile_image)) > 0)`);
}
