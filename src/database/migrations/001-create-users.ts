import type { PoolClient } from 'pg';

export const id = '001-create-users';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE users (
      id uuid PRIMARY KEY,
      full_name varchar(120) NOT NULL,
      email varchar(254) NOT NULL,
      password_hash varchar(255) NOT NULL,
      cep varchar(9) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT users_full_name_not_blank CHECK (length(trim(full_name)) >= 2),
      CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
      CONSTRAINT users_cep_format CHECK (cep ~ '^[0-9]{5}-[0-9]{3}$')
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX users_email_unique ON users (lower(email))
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS users');
}
