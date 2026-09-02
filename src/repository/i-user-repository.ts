import type { User } from '../entities/user-entity.js';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
}
