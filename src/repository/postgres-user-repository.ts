import type { Pool } from 'pg';

import { User } from '../entities/user-entity.js';
import { UserAlreadyExistsError } from '../exception/user-already-exists-error.js';
import type { IUserRepository } from './i-user-repository.js';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  cep: string;
  created_at: Date;
  updated_at: Date;
}

function toUser(row: UserRow): User {
  return new User({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    cep: row.cep,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function isEmailUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const databaseError = error as { code?: unknown; constraint?: unknown };

  return (
    databaseError.code === '23505' &&
    databaseError.constraint === 'users_email_unique'
  );
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `
        SELECT id, full_name, email, password_hash, cep, created_at, updated_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return toUser(row);
  }

  async create(user: User): Promise<User> {
    try {
      const result = await this.pool.query<UserRow>(
        `
          INSERT INTO users (
            id,
            full_name,
            email,
            password_hash,
            cep,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, full_name, email, password_hash, cep, created_at, updated_at
        `,
        [
          user.id,
          user.fullName,
          user.email,
          user.passwordHash,
          user.cep,
          user.createdAt,
          user.updatedAt,
        ],
      );

      const row = result.rows[0];

      if (!row) {
        throw new Error('O banco não retornou o usuário criado.');
      }

      return toUser(row);
    } catch (error: unknown) {
      if (isEmailUniqueViolation(error)) {
        throw new UserAlreadyExistsError();
      }

      throw error;
    }
  }
}
