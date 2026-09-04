import { randomUUID } from 'node:crypto';

import { User } from '../entities/user-entity.js';
import { UserAlreadyExistsError } from '../exception/user-already-exists-error.js';
import { PasswordPolicy } from '../policy/password-policy.js';
import type { IHashProvider } from '../providers/i-hash-provider.js';
import type { IUserRepository } from '../repository/i-user-repository.js';

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  cep: string;
}

export interface CreateUserOutput {
  id: string;
  fullName: string;
  email: string;
  cep: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();

    PasswordPolicy.assertValid(input.password);

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const passwordHash = await this.hashProvider.hash(input.password);
    const now = new Date();
    const user = new User({
      id: randomUUID(),
      fullName: input.fullName,
      email: normalizedEmail,
      passwordHash,
      cep: input.cep.trim(),
      createdAt: now,
      updatedAt: now,
    });
    const createdUser = await this.userRepository.create(user);

    return {
      id: createdUser.id,
      fullName: createdUser.fullName,
      email: createdUser.email,
      cep: createdUser.cep,
    };
  }
}
