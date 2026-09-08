import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { GetCurrentUserController } from '../../src/Http/controller/get-current-user-controller.js';
import { AuthMiddleware } from '../../src/Http/middleware/auth-middleware.js';
import { User } from '../../src/entities/user-entity.js';
import { GetCurrentUserUseCase } from '../../src/use-case/get-current-user-use-case.js';

function setup(userExists = true) {
  const user = new User({
    id: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
    fullName: 'Thiago Rosario',
    email: 'thiago@email.com',
    cep: '40000-000',
    passwordHash: 'private-hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const repository = {
    findByEmail: vi.fn(async () => null),
    findById: vi.fn(async () => userExists ? user : null),
  };
  const { handle } = new GetCurrentUserController(new GetCurrentUserUseCase(repository));
  const response = {
    locals: { userId: user.id } as Record<string, unknown>,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  const req = { body: { userId: 'untrusted-id' } } as Request;
  const run = () => handle(req, response as unknown as Response, next);
  return { user, repository, response, next, req, run };
}

describe('GetCurrentUserController', () => {
  it('uses the id verified by AuthMiddleware and returns only public data', async () => {
    const { user, repository, response, next, req, run } = setup();
    const verify = vi.fn(() => ({ userId: user.id }));
    const middleware = new AuthMiddleware({ generate: vi.fn(), verify });
    response.locals = {};
    req.cookies = { access_token: 'signed-token' };
    middleware.handle(req, response as unknown as Response, vi.fn());

    await run();

    expect(verify).toHaveBeenCalledExactlyOnceWith('signed-token');
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(user.id);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: { user: { id: user.id, fullName: user.fullName, email: user.email, cep: user.cep } },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 123])('rejects invalid locals userId (%j)', async (userId) => {
    const { response, repository, run } = setup();
    response.locals = { userId };
    await run();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when the authenticated user no longer exists', async () => {
    const { response, next, run } = setup(false);
    await run();
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Usuário não encontrado.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards unexpected errors to the global error middleware', async () => {
    const { repository, response, next, run } = setup();
    const error = new Error('Database unavailable');
    repository.findById.mockRejectedValueOnce(error);
    await run();
    expect(next).toHaveBeenCalledExactlyOnceWith(error);
    expect(response.status).not.toHaveBeenCalled();
  });
});
