import type { NextFunction, Request, Response } from 'express';

import type { LogoutUseCase } from '../../use-case/logout-use-case.js';
import { AuthCookieManager } from '../helper/auth-cookie-manager.js';

export class LogoutController {
  constructor(private readonly logoutUseCase: LogoutUseCase) {}

  handle = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.logoutUseCase.execute(new AuthCookieManager(response));

      response.status(200).json({
        success: result.success,
        message: 'Logout realizado com sucesso.',
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}
