import type { NextFunction, Request, Response } from 'express';

import { InvalidProductCategoryError } from '../../../value-object/product-category-value-object.js';
import type { ListProductsUseCase } from '../../../use-case/product/list-products-use-case.js';
import { listProductsQuerySchema } from '../../request/product/list-products-request.js';

export class ListProductsController {
  constructor(private readonly listProductsUseCase: ListProductsUseCase) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const input = listProductsQuerySchema.safeParse(request.query);
    if (!input.success) {
      response.status(400).json({
        success: false,
        message: 'Verifique os dados informados.',
        errors: input.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'query',
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const product = await this.listProductsUseCase.execute(input.data.categoryId === undefined ? {} : { categoryId: input.data.categoryId });
      response.status(200).json({
        success: true,
        data: { products: product },
      });
    } catch (error: unknown) {
      if (error instanceof InvalidProductCategoryError) {
        response.status(400).json({ success: false, message: error.message });
        return;
      }

      next(error);
    }
  };
}
