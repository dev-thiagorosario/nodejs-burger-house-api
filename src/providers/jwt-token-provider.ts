import jwt from 'jsonwebtoken';

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
}
