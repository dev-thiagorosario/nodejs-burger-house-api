import jwt from 'jsonwebtoken';

import { JsonWebTokenError } from '../exception/jsow-web-token-error.js';
import type { ITokenProvider } from './i-token-provider.js';

export class JwtTokenProvider implements ITokenProvider {
  constructor(private readonly secret: string) {}

  generate(userId: string): string {
    return jwt.sign({}, this.secret, {
      algorithm: 'HS256',
      expiresIn: '1d',
      subject: userId,
    });
  }

  verify(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      });

      if (
        typeof payload !== 'object' ||
        typeof payload.sub !== 'string' ||
        payload.sub.trim().length === 0 ||
        typeof payload.exp !== 'number'
      ) {
        throw new JsonWebTokenError();
      }

      return { userId: payload.sub };
    } catch (error: unknown) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new JsonWebTokenError();
      }

      throw error;
    }
  }
}
