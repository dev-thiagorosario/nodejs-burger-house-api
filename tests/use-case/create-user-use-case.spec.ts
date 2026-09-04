import { describe, expect, it, vi } from 'vitest';

import { User } from '../../src/entities/user-entity.js';
import { UserAlreadyExistsError } from '../../src/exception/user-already-exists-error.js';
import { InvalidPasswordError } from '../../src/policy/password-policy.js';
import type { IHashProvider } from '../../src/providers/i-hash-provider.js';
import type { IUserRepository } from '../../src/repository/i-user-repository.js';
import { CreateUserUseCase } from '../../src/use-case/create-user-use-case.js';

const existingUser = new User({
  id: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
  fullName: 'Existing User',
  email: 'existing@email.com',
  passwordHash: '$2b$12$stored-password-hash',
  cep: '40000-000',
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
});

function createDependencies(foundUser: User | null = null) {
  const userRepository = {
    findByEmail: vi.fn(async () => foundUser),
    create: vi.fn(async (user: User) => user),
  } satisfies IUserRepository;
  const hashProvider = {
    hash: vi.fn(async () => '$2b$12$generated-password-hash'),
    compare: vi.fn(async () => true),
  } satisfies IHashProvider;

  return { userRepository, hashProvider };
}

describe('CreateUserUseCase', () => {
  it('hashes the password, creates the user and returns only public data', async () => {
    const dependencies = createDependencies();
    const useCase = new CreateUserUseCase(
      dependencies.userRepository,
      dependencies.hashProvider,
    );

    const result = await useCase.execute({
      fullName: '  Thiago Rosario  ',
      email: '  THIAGO@EMAIL.COM  ',
      password: 'Senha123',
      cep: ' 40000-000 ',
    });

    expect(result).toEqual({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
      fullName: 'Thiago Rosario',
      email: 'thiago@email.com',
      cep: '40000-000',
    });
    expect(dependencies.userRepository.findByEmail).toHaveBeenCalledWith(
      'thiago@email.com',
    );
    expect(dependencies.hashProvider.hash).toHaveBeenCalledWith('Senha123');

    const userToCreate = dependencies.userRepository.create.mock.calls[0]?.[0];

    expect(userToCreate).toBeInstanceOf(User);
    expect(userToCreate?.passwordHash).toBe(
      '$2b$12$generated-password-hash',
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects an existing email without hashing or creating a user', async () => {
    const dependencies = createDependencies(existingUser);
    const useCase = new CreateUserUseCase(
      dependencies.userRepository,
      dependencies.hashProvider,
    );

    await expect(
      useCase.execute({
        fullName: 'Thiago Rosario',
        email: ' EXISTING@EMAIL.COM ',
        password: 'Senha123',
        cep: '40000-000',
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError);
    expect(dependencies.userRepository.findByEmail).toHaveBeenCalledWith(
      'existing@email.com',
    );
    expect(dependencies.hashProvider.hash).not.toHaveBeenCalled();
    expect(dependencies.userRepository.create).not.toHaveBeenCalled();
  });

  it('applies the password policy before accessing dependencies', async () => {
    const dependencies = createDependencies();
    const useCase = new CreateUserUseCase(
      dependencies.userRepository,
      dependencies.hashProvider,
    );

    await expect(
      useCase.execute({
        fullName: 'Thiago Rosario',
        email: 'thiago@email.com',
        password: 'short',
        cep: '40000-000',
      }),
    ).rejects.toBeInstanceOf(InvalidPasswordError);
    expect(dependencies.userRepository.findByEmail).not.toHaveBeenCalled();
    expect(dependencies.hashProvider.hash).not.toHaveBeenCalled();
    expect(dependencies.userRepository.create).not.toHaveBeenCalled();
  });

});
