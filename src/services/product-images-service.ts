import type { Pool } from 'pg';

import type { ImageVariant } from '../entities/product-image.js';

export function detectImageType(data: Buffer): string | null {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (['GIF87a', 'GIF89a'].includes(data.toString('ascii', 0, 6))) return 'image/gif';
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (data.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(data.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}

export async function saveProductImage(pool: Pool, id: string, variant: ImageVariant, fileName: string, data: Buffer, overwrite = true): Promise<boolean> {
  const mime = detectImageType(data);
  if (!fileName.trim()) throw new Error('Nome de arquivo inválido.');
  if (!mime) throw new Error('Formato de imagem inválido.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (!product.rows.length) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(`INSERT INTO product_images (product_id, variant, file_name, mime_type, data)
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (product_id, variant) ${overwrite
        ? 'DO UPDATE SET file_name = EXCLUDED.file_name, mime_type = EXCLUDED.mime_type, data = EXCLUDED.data, updated_at = now()'
        : 'DO NOTHING'}`, [id, variant, fileName, mime, data]);
    await client.query('UPDATE products SET updated_at = now() WHERE id = $1', [id]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function removeProductImage(pool: Pool, id: string, variant: ImageVariant): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [id]);
    const result = await client.query(
      'DELETE FROM product_images WHERE product_id = $1 AND variant = $2 RETURNING id', [id, variant],
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query('UPDATE products SET updated_at = now() WHERE id = $1', [id]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
