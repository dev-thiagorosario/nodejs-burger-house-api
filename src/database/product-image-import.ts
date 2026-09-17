import { readFile, realpath } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';
import type { ImageVariant } from '../entities/product-image.js';
import { detectImageType } from '../services/product-images-service.js';

const storage = fileURLToPath(new URL('../../storage/', import.meta.url));

/** Uses the caller's transaction; never overwrites an existing upload. */
export async function importProductImage(
  client: PoolClient, productId: string, variant: ImageVariant, source: string,
): Promise<void> {
  const existing = await client.query(
    'SELECT id FROM product_images WHERE product_id = $1 AND variant = $2', [productId, variant],
  );
  if (existing.rows.length) return;
  try {
    if (!/^\/(assets|assets_drinks|assets_sides)\//.test(source)) {
      throw new Error('O caminho não corresponde a um arquivo local em storage. Importe os bytes antes de migrar.');
    }
    const root = await realpath(storage);
    const path = await realpath(resolve(root, source.slice(1)));
    if (!path.startsWith(root + sep)) throw new Error('Caminho fora de storage.');
    const data = await readFile(path);
    const mime = detectImageType(data);
    if (!mime) throw new Error('Formato de imagem inválido.');
    await client.query(`INSERT INTO product_images (product_id, variant, file_name, mime_type, data)
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (product_id, variant) DO NOTHING`,
    [productId, variant, basename(path), mime, data]);
  } catch (error) {
    throw new Error(`Não foi possível importar a imagem ${productId}/${variant}. As colunas antigas devem ser preservadas.`, { cause: error });
  }
}
