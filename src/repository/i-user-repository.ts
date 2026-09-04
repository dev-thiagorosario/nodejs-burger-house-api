import type { User } from '../entities/user-entity.js';

export interface IUserReader {
  findByEmail(email: string): Promise<User | null>;
}

export interface IUserWriter {
  create(user: User): Promise<User>;
}

export interface IUserRepository extends IUserReader, IUserWriter {}
