import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { JsonWebTokenError } from '../../src/exception/jsow-web-token-error.js';
import { JwtTokenProvider } from '../../src/providers/jwt-token-provider.js';

const secret = 'test-secret';
const provider = new JwtTokenProvider(secret);

describe('JwtTokenProvider', () => {
  it('validates a generated token and returns its user id', () => {
    expect(provider.verify(provider.generate('user-id'))).toEqual({ userId: 'user-id' });
  });

  it.each([
    ['malformed', 'invalid-token'],
    ['empty', ''],
    ['wrong signature', new JwtTokenProvider('other-secret').generate('user-id')],
    ['expired', jwt.sign({ sub: 'user-id' }, secret, { expiresIn: -1 })],
    ['not active yet', jwt.sign({ sub: 'user-id' }, secret, { expiresIn: '1d', notBefore: '1h' })],
    ['wrong algorithm', jwt.sign({ sub: 'user-id' }, secret, { algorithm: 'HS384', expiresIn: '1d' })],
    ['missing subject', jwt.sign({}, secret, { expiresIn: '1d' })],
    ['empty subject', jwt.sign({ sub: '   ' }, secret, { expiresIn: '1d' })],
    ['non-string subject', jwt.sign({ sub: 123 }, secret, { expiresIn: '1d' })],
    ['missing expiration', jwt.sign({ sub: 'user-id' }, secret)],
    ['string payload', jwt.sign('user-id', secret)],
  ])('rejects a %s token with the application error', (_description, token) => {
    expect(() => provider.verify(token)).toThrow(JsonWebTokenError);
  });
});
