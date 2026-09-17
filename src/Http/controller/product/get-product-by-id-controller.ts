import type { NextFunction, Request, Response } from 'express';

import { ProductNotFoundError } from '../../../exception/product-not-found-error.js';
import type { GetProductByIdUseCase } from '../../../use-case/product/get-product-by-id-use-case.js';
import { getProductByIdParamsSchema } from '../../request/product/get-product-by-id-request.js';

export class GetProductByIdController {
  constructor(private readonly getProductByIdUseCase: GetProductByIdUseCase) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const input = getProductByIdParamsSchema.safeParse(request.params);
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
      const product = await this.getProductByIdUseCase.execute(input.data.id);
      response.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error: unknown) {
      if (error instanceof ProductNotFoundError) {
        response.status(404).json({ success: false, message: error.message });
        return;
      }

      next(error);
    }
  };
}
