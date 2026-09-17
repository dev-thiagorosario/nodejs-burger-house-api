import type { NextFunction, Request, Response } from 'express';

import { ProductNotFoundError } from '../../../exception/product-not-found-error.js';
import type { DeleteProductUseCase } from '../../../use-case/product/delete-product-use-case.js';
import { deleteProductParamsSchema } from '../../request/product/delete-product-request.js';

export class DeleteProductController {
  constructor(private readonly deleteProductUseCase: DeleteProductUseCase) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const input = deleteProductParamsSchema.safeParse(request.params);
    if (!input.success) {
      response.status(400).json({
        success: false,
        message: 'Verifique os dados informados.',
        errors: input.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'params',
          message: issue.message,
        })),
      });
      return;
    }

    try {
      await this.deleteProductUseCase.execute(input.data.id);
      response.status(204).send();
    } catch (error: unknown) {
      if (error instanceof ProductNotFoundError) {
        response.status(404).json({ success: false, message: error.message });
        return;
      }

      next(error);
    }
  };
}
