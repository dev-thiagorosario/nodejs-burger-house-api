import type { Pool } from 'pg';

import { User } from '../entities/user-entity.js';
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
}
