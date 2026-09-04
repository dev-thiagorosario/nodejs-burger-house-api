import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { User } from '../../src/entities/user-entity.js';
import { UserAlreadyExistsError } from '../../src/exception/user-already-exists-error.js';
import { PostgresUserRepository } from '../../src/repository/postgres-user-repository.js';

const user = new User({
  id: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
  fullName: 'Thiago Rosario',
  email: 'thiago@email.com',
  passwordHash: '$2b$12$stored-password-hash',
  cep: '40000-000',
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
});

const userRow = {
  id: user.id,
  full_name: user.fullName,
  email: user.email,
  password_hash: user.passwordHash,
  cep: user.cep,
  created_at: user.createdAt,
  updated_at: user.updatedAt,
};

describe('PostgresUserRepository.create', () => {
  it('persists the complete user and maps the returned row', async () => {
    const query = vi.fn(async () => ({ rows: [userRow] }));
    const repository = new PostgresUserRepository({ query } as unknown as Pool);

    const result = await repository.create(user);

    expect(result).toEqual(user);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), [
      user.id,
      user.fullName,
      user.email,
      user.passwordHash,
      user.cep,
      user.createdAt,
      user.updatedAt,
    ]);
  });

  it('translates an email unique violation into an application error', async () => {
    const query = vi.fn(async () => {
      throw { code: '23505', constraint: 'users_email_unique' };
    });
    const repository = new PostgresUserRepository({ query } as unknown as Pool);

    await expect(repository.create(user)).rejects.toBeInstanceOf(
      UserAlreadyExistsError,
    );
  });

  it('does not hide unrelated database errors', async () => {
    const databaseError = new Error('database unavailable');
    const query = vi.fn(async () => {
      throw databaseError;
    });
    const repository = new PostgresUserRepository({ query } as unknown as Pool);

    await expect(repository.create(user)).rejects.toBe(databaseError);
  });
});
