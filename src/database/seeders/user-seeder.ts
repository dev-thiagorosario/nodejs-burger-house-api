import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { hash } from 'bcryptjs';

import { createPostgresPool } from '../data-source.js';

const TEST_USER = {
  fullName: 'Thiago',
  email: 'thiago@email.com',
  password: 'Senha123',
  cep: '40000-000',
} as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
}

const pool = createPostgresPool(databaseUrl);

async function seedUser(): Promise<void> {
  const passwordHash = await hash(TEST_USER.password, 10);

  await pool.query(
    `
      INSERT INTO users (id, full_name, email, password_hash, cep)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ((lower(email))) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        cep = EXCLUDED.cep,
        updated_at = now()
    `,
    [
      randomUUID(),
      TEST_USER.fullName,
      TEST_USER.email,
      passwordHash,
      TEST_USER.cep,
    ],
  );

  console.log(`Usuário de teste criado: ${TEST_USER.email}`);
}

seedUser()
  .catch((error: unknown) => {
    console.error('Falha ao criar o usuário de teste.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
