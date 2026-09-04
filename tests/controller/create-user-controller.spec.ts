import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { CreateUserController } from '../../src/Http/controller/create-user-controller.js';
import { User } from '../../src/entities/user-entity.js';
import type { IHashProvider } from '../../src/providers/i-hash-provider.js';
import type { IUserRepository } from '../../src/repository/i-user-repository.js';
import { CreateUserUseCase } from '../../src/use-case/create-user-use-case.js';

function createApp(options: {
  userExists?: boolean;
  creationError?: Error;
} = {}) {
  const existingUser = new User({
    id: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
    fullName: 'Existing User',
    email: 'existing@email.com',
    passwordHash: '$2b$12$stored-password-hash',
    cep: '40000-000',
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    updatedAt: new Date('2026-09-01T12:00:00.000Z'),
  });
  const userRepository = {
    findByEmail: vi.fn(async () =>
      options.userExists === true ? existingUser : null,
    ),
    create: vi.fn(async (user: User) => {
      if (options.creationError) {
        throw options.creationError;
      }

      return user;
    }),
  } satisfies IUserRepository;
  const hashProvider = {
    hash: vi.fn(async () => '$2b$12$generated-password-hash'),
    compare: vi.fn(async () => true),
  } satisfies IHashProvider;
  const useCase = new CreateUserUseCase(userRepository, hashProvider);
  const controller = new CreateUserController(useCase);
  const app = express();

  app.use(express.json());
  app.post('/register', controller.handle);
  app.use(
    (
      _error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      response.status(500).json({
        success: false,
        message: 'Erro interno do servidor.',
      });
    },
  );

  return app;
}

describe('CreateUserController', () => {
  it('responds with 201 and only the public data of the created user', async () => {
    const response = await request(createApp()).post('/register').send({
      fullName: '  Thiago Rosario  ',
      email: '  THIAGO@EMAIL.COM  ',
      password: 'Senha123',
      cep: ' 40000-000 ',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: 'Usuário criado com sucesso.',
      data: {
        user: {
          id: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
          fullName: 'Thiago Rosario',
          email: 'thiago@email.com',
          cep: '40000-000',
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('password');
  });

  it('responds with 400 and field errors when the body is invalid', async () => {
    const response = await request(createApp()).post('/register').send({
      fullName: ' ',
      email: 'invalid-email',
      password: 'short',
      cep: '40000000',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Verifique os dados informados.',
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'fullName' }),
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
        expect.objectContaining({ field: 'cep' }),
      ]),
    });
  });

  it('responds with 400 when the password exceeds the bcrypt byte limit', async () => {
    const response = await request(createApp()).post('/register').send({
      fullName: 'Thiago Rosario',
      email: 'thiago@email.com',
      password: 'á'.repeat(37),
      cep: '40000-000',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      errors: [
        {
          field: 'password',
          message: 'A senha deve conter no máximo 72 bytes.',
        },
      ],
    });
  });

  it('responds with 409 when the email already exists', async () => {
    const response = await request(createApp({ userExists: true }))
      .post('/register')
      .send({
        fullName: 'Thiago Rosario',
        email: 'existing@email.com',
        password: 'Senha123',
        cep: '40000-000',
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'Já existe um usuário cadastrado com este email.',
    });
  });

  it('delegates unexpected errors to the error middleware', async () => {
    const response = await request(
      createApp({ creationError: new Error('database unavailable') }),
    )
      .post('/register')
      .send({
        fullName: 'Thiago Rosario',
        email: 'thiago@email.com',
        password: 'Senha123',
        cep: '40000-000',
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Erro interno do servidor.',
    });
  });
});
