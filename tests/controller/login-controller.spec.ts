import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { LoginController } from '../../src/Http/controller/login-controller.js';
import { User } from '../../src/entities/user-entity.js';
import type { IHashComparer } from '../../src/providers/i-hash-provider.js';
import type { ITokenProvider } from '../../src/providers/i-token-provider.js';
import type { IUserReader } from '../../src/repository/i-user-repository.js';
import { LoginUseCase } from '../../src/use-case/login-use-case.js';

function createApp(options: { userExists?: boolean; passwordMatches?: boolean }) {
  const user = new User({
    id: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
    fullName: 'Thiago Rosario',
    email: 'thiago@email.com',
    passwordHash: '$2b$10$stored-password-hash',
    cep: '40000-000',
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    updatedAt: new Date('2026-09-01T12:00:00.000Z'),
  });
  const userRepository = {
    findByEmail: vi.fn(async () =>
      options.userExists === false ? null : user,
    ),
  } satisfies IUserReader;
  const hashProvider = {
    compare: vi.fn(async () => options.passwordMatches !== false),
  } satisfies IHashComparer;
  const tokenProvider = {
    generate: vi.fn(() => 'signed-jwt'),
  } satisfies ITokenProvider;
  const useCase = new LoginUseCase(
    userRepository,
    hashProvider,
    tokenProvider,
  );
  const controller = new LoginController(useCase);
  const app = express();

  app.use(express.json());
  app.post('/login', controller.handle);

  return app;
}

describe('LoginController', () => {
  it('responds with 200, a message, a token and public user data', async () => {
    const response = await request(createApp({}))
      .post('/login')
      .send({ email: 'thiago@email.com', password: 'plain-password' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Login realizado com sucesso.',
      data: {
        token: 'signed-jwt',
        user: {
          id: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
          fullName: 'Thiago Rosario',
          email: 'thiago@email.com',
          cep: '40000-000',
        },
      },
    });
  });

  it('responds with 401 when the user does not exist', async () => {
    const response = await request(createApp({ userExists: false }))
      .post('/login')
      .send({ email: 'unknown@email.com', password: 'plain-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Email ou senha inválidos.',
    });
  });

  it('responds with 401 when the password is incorrect', async () => {
    const response = await request(createApp({ passwordMatches: false }))
      .post('/login')
      .send({ email: 'thiago@email.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Email ou senha inválidos.',
    });
  });

  it('responds with 400 when the request body is invalid', async () => {
    const response = await request(createApp({}))
      .post('/login')
      .send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Verifique os dados informados.',
      errors: [
        { field: 'email', message: 'Informe um email válido.' },
        { field: 'password', message: 'A senha deve ser informada.' },
      ],
    });
  });
});
