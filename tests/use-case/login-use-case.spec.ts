import { describe, expect, it, vi } from 'vitest';

import { User } from '../../src/entities/user-entity.js';
import type { IHashComparer } from '../../src/providers/i-hash-provider.js';
import type { ITokenProvider } from '../../src/providers/i-token-provider.js';
import type { IUserReader } from '../../src/repository/i-user-repository.js';
import { InvalidCredentialsError } from '../../src/exception/invalid-credentials-error.js';
import { LoginUseCase } from '../../src/use-case/login-use-case.js';

const user = new User({
  id: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
  fullName: 'Thiago Rosario',
  email: 'thiago@email.com',
  passwordHash: '$2b$10$stored-password-hash',
  cep: '40000-000',
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
});

function createDependencies(
  foundUser: User | null = user,
  passwordMatches = true,
) {
  const userRepository = {
    findByEmail: vi.fn(async (): Promise<User | null> => foundUser),
  } satisfies IUserReader;
  const hashProvider = {
    compare: vi.fn(async () => passwordMatches),
  } satisfies IHashComparer;
  const tokenProvider = {
    generate: vi.fn(() => 'signed-jwt'),
  } satisfies ITokenProvider;

  return { userRepository, hashProvider, tokenProvider };
}

describe('LoginUseCase', () => {
  it('returns a token and the public user data when credentials are valid', async () => {
    const dependencies = createDependencies();
    const useCase = new LoginUseCase(
      dependencies.userRepository,
      dependencies.hashProvider,
      dependencies.tokenProvider,
    );

    const result = await useCase.execute({
      email: '  THIAGO@EMAIL.COM ',
      password: 'plain-password',
    });

    expect(result).toEqual({
      token: 'signed-jwt',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        cep: user.cep,
      },
    });
    expect(dependencies.userRepository.findByEmail).toHaveBeenCalledWith(
      'thiago@email.com',
    );
    expect(dependencies.hashProvider.compare).toHaveBeenCalledWith(
      'plain-password',
      user.passwordHash,
    );
    expect(dependencies.tokenProvider.generate).toHaveBeenCalledWith(user.id);
  });

  it('rejects an unknown email without comparing a password', async () => {
    const dependencies = createDependencies(null);
    const useCase = new LoginUseCase(
      dependencies.userRepository,
      dependencies.hashProvider,
      dependencies.tokenProvider,
    );

    await expect(
      useCase.execute({
        email: 'unknown@email.com',
        password: 'plain-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(dependencies.hashProvider.compare).not.toHaveBeenCalled();
    expect(dependencies.tokenProvider.generate).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password without generating a token', async () => {
    const dependencies = createDependencies(user, false);
    const useCase = new LoginUseCase(
      dependencies.userRepository,
      dependencies.hashProvider,
      dependencies.tokenProvider,
    );

    await expect(
      useCase.execute({
        email: user.email,
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(dependencies.tokenProvider.generate).not.toHaveBeenCalled();
  });
});
