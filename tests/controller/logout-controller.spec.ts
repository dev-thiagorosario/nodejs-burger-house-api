import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LogoutController } from '../../src/Http/controller/logout-controller.js';
import { setAuthCookie } from '../../src/Http/helper/auth-cookie.js';
import { AuthMiddleware } from '../../src/Http/middleware/auth-middleware.js';
import { LogoutUseCase } from '../../src/use-case/logout-use-case.js';

function createApp() {
  const app = express();
  const controller = new LogoutController(new LogoutUseCase());
  const auth = new AuthMiddleware({
    generate: () => 'signed-jwt',
    verify: () => ({ userId: 'user-id' }),
  });

  app.use(cookieParser());
  app.post('/login', (_req, res) => {
    setAuthCookie(res, 'signed-jwt');
    res.sendStatus(200);
  });
  app.post('/logout', controller.handle);
  app.get('/protected', auth.handle, (_req, res) => res.sendStatus(200));
  return app;
}

afterEach(() => vi.unstubAllEnvs());

describe('LogoutController', () => {
  it.each([undefined, 'access_token=invalid', 'access_token='])('clears the cookie without requiring a valid session (%s)', async (cookie) => {
    const pending = request(createApp()).post('/logout');
    if (cookie) pending.set('Cookie', cookie);
    const response = await pending;

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Logout realizado com sucesso.',
    });
    expect(response.headers['set-cookie']).toEqual([
      expect.stringMatching(/^access_token=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax$/),
    ]);
  });

  it('removes browser authentication and allows repeated logout', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const agent = request.agent(createApp());
    await agent.post('/login').expect(200);
    await agent.get('/protected').expect(200);
    await agent.post('/logout').expect(200);
    await agent.get('/protected').expect(401);
    await agent.post('/logout').expect(200);
  });

  it('preserves the secure cookie attributes in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await request(createApp()).post('/logout');

    expect(response.headers['set-cookie']).toEqual([
      expect.stringContaining('; HttpOnly; Secure; SameSite=Lax'),
    ]);
  });
});
