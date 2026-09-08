import type { NextFunction, Request, Response } from 'express';

import { UserNotFoundError } from '../../exception/user-not-found-error.js';
import type { GetCurrentUserUseCase } from '../../use-case/get-current-user-use-case.js';
import { getCurrentUserRequestSchema } from '../request/get-current-user-request.js';

export class GetCurrentUserController {
  constructor(private readonly getCurrentUserUseCase: GetCurrentUserUseCase) {}

  handle = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const input = getCurrentUserRequestSchema.safeParse(response.locals);

    if (!input.success) {
      response.status(401).json({
        success: false,
        message: 'Não autenticado.',
      });
      return;
    }

    try {
      const user = await this.getCurrentUserUseCase.execute(input.data.userId);

      response.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error: unknown) {
      if (error instanceof UserNotFoundError) {
        response.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  };
}
