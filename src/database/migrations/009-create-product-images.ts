import type { PoolClient } from 'pg';

export const id = '009-create-product-images';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE product_images (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      product_id varchar(255) NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      variant varchar(20) NOT NULL,
      file_name text NOT NULL,
      mime_type varchar(100) NOT NULL,
      data bytea NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT product_images_product_variant_unique UNIQUE (product_id, variant),
      CONSTRAINT product_images_variant_valid CHECK (variant IN ('desktop', 'mobile')),
      CONSTRAINT product_images_file_name_not_blank CHECK (length(trim(file_name)) > 0),
      CONSTRAINT product_images_mime_type_valid CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif')),
      CONSTRAINT product_images_data_not_empty CHECK (octet_length(data) > 0)
    )
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS product_images');
}
