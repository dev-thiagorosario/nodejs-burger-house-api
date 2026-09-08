import type { NextFunction, Request, Response } from 'express';

import type { ITokenProvider } from '../../providers/i-token-provider.js';
import { AUTH_COOKIE_NAME } from '../helper/auth-cookie.js';

export class AuthMiddleware {
  constructor(private readonly tokenProvider: ITokenProvider) {}

  handle = (request: Request, response: Response, next: NextFunction): void => {
    const token: unknown = request.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      response.status(401).json({
        success: false,
        message: 'Não autenticado.',
      });
      return;
    }

    if (typeof token !== 'string') {
      response.status(401).json({
        success: false,
        message: 'Sessão inválida ou expirada.',
      });
      return;
    }

    try {
      const { userId } = this.tokenProvider.verify(token);
      response.locals.userId = userId;
    } catch {
      response.status(401).json({
        success: false,
        message: 'Sessão inválida ou expirada.',
      });
      return;
    }

    next();
  };
}
