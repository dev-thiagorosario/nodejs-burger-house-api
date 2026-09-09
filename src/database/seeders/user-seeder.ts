import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { hash } from 'bcryptjs';

import { createPostgresPool } from '../data-source.js';

const TEST_USERS = [
  {
    fullName: 'Thiago',
    email: 'thiago@email.com',
    password: 'Senha123',
    cep: '40000-000',
    isAdmin: false,
  },
  {
    fullName: 'Administrador',
    email: 'admin@email.com',
    password: 'Senha123',
    cep: '40000-000',
    isAdmin: true,
  },
] as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória.');
}

const pool = createPostgresPool(databaseUrl);

async function seedUsers(): Promise<void> {
  for (const user of TEST_USERS) {
    const passwordHash = await hash(user.password, 10);

    await pool.query(
      `
        INSERT INTO users (id, full_name, email, password_hash, cep, is_admin)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ((lower(email))) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          cep = EXCLUDED.cep,
          is_admin = users.is_admin OR EXCLUDED.is_admin,
          updated_at = now()
      `,
      [
        randomUUID(),
        user.fullName,
        user.email,
        passwordHash,
        user.cep,
        user.isAdmin,
      ],
    );

    console.log(`Usuário de teste criado: ${user.email}`);
  }
}

seedUsers()
  .catch((error: unknown) => {
    console.error('Falha ao criar os usuários de teste.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
