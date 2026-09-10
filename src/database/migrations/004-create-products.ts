import type { PoolClient } from 'pg';

export const id = '004-create-products';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE products (
      id varchar(255) PRIMARY KEY,
      title varchar(255) NOT NULL,
      description text NOT NULL,
      image text NOT NULL,
      mobile_image text NOT NULL,
      image_alt text,
      price numeric(10, 2) NOT NULL,
      category_id smallint NOT NULL REFERENCES product_categories (id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT products_id_not_blank CHECK (length(trim(id)) > 0),
      CONSTRAINT products_title_not_blank CHECK (length(trim(title)) > 0),
      CONSTRAINT products_image_not_blank CHECK (length(trim(image)) > 0),
      CONSTRAINT products_mobile_image_not_blank CHECK (length(trim(mobile_image)) > 0),
      CONSTRAINT products_price_non_negative CHECK (price >= 0 AND price <> 'NaN'::numeric)
    )
  `);

  await client.query('CREATE INDEX products_category_id_index ON products (category_id)');

  await client.query(`
    CREATE FUNCTION set_product_image_alt() RETURNS trigger AS $$
    BEGIN
      NEW.image_alt := COALESCE(NULLIF(trim(NEW.image_alt), ''), NEW.title);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await client.query(`
    CREATE TRIGGER products_image_alt_fallback
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_product_image_alt()
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS products');
  await client.query('DROP FUNCTION IF EXISTS set_product_image_alt()');
}
