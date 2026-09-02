import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { InvalidCredentialsError } from '../exception/invalid-credentials-error.js';
import type { LoginUseCase } from '../use-case/login-use-case.js';

const loginBodySchema = z.object({
  email: z
    .string('O email deve ser informado.')
    .trim()
    .min(1, 'O email deve ser informado.')
    .pipe(z.email('Informe um email válido.')),
  password: z
    .string('A senha deve ser informada.')
    .min(1, 'A senha deve ser informada.'),
});

export class LoginController {
  constructor(private readonly loginUseCase: LoginUseCase) { }

  handle = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const body = loginBodySchema.safeParse(request.body);

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
      const result = await this.loginUseCase.execute(body.data);
      response.status(200).json({
        success: true,
        message: 'Login realizado com sucesso.',
        data: result,
      });
    } catch (error: unknown) {
      if (error instanceof InvalidCredentialsError) {
        response.status(401).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  };
}
