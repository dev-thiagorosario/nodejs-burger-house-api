import type { NextFunction, Request, Response } from 'express';

import { InvalidUserError } from '../../entities/user-entity.js';
import { UserAlreadyExistsError } from '../../exception/user-already-exists-error.js';
import { InvalidPasswordError } from '../../policy/password-policy.js';
import type { CreateUserUseCase } from '../../use-case/create-user-use-case.js';
import { createUserBodySchema } from '../request/create-user-request.js';

export class CreateUserController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  handle = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const body = createUserBodySchema.safeParse(request.body);

    if (!body.success) {
      response.status(400).json({
        success: false,
        message: 'Verifique os dados informados.',
        errors: body.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const user = await this.createUserUseCase.execute(body.data);

      response.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso.',
        data: { user },
      });
    } catch (error: unknown) {
      if (error instanceof UserAlreadyExistsError) {
        response.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (
        error instanceof InvalidUserError ||
        error instanceof InvalidPasswordError
      ) {
        response.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  };
}
