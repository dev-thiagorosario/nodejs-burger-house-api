import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { AuthMiddleware } from '../../src/Http/middleware/auth-middleware.js';
import type { ITokenProvider } from '../../src/providers/i-token-provider.js';

function setup(cookies?: Record<string, unknown>) {
  const provider = {
    generate: vi.fn(() => 'token'),
    verify: vi.fn(() => ({ userId: 'user-id' })),
  } satisfies ITokenProvider;
  const response = {
    locals: {},
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  const { handle } = new AuthMiddleware(provider);
  const run = () => handle(
    { cookies } as Request,
    response as unknown as Response,
    next as NextFunction,
  );
  return { provider, response, next, run };
}

describe('AuthMiddleware', () => {
  it.each([undefined, {}, { access_token: '' }])('rejects missing tokens (%j)', (cookies) => {
    const { run, provider, response, next } = setup(cookies);
    run();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(provider.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-string cookies', () => {
    const { run, provider, response, next } = setup({ access_token: { userId: 'fake' } });
    run();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(provider.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired tokens', () => {
    const { run, provider, response, next } = setup({ access_token: 'invalid' });
    provider.verify.mockImplementation(() => { throw new Error('Invalid token'); });
    run();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.locals).toEqual({});
    expect(next).not.toHaveBeenCalled();
  });

  it('stores only the verified user id and continues when passed as a callback', () => {
    const { run, provider, response, next } = setup({ access_token: 'valid' });
    run();
    expect(provider.verify).toHaveBeenCalledWith('valid');
    expect(response.locals).toEqual({ userId: 'user-id' });
    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(response.status).not.toHaveBeenCalled();
  });
});
