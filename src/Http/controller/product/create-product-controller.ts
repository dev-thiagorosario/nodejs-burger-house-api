import type { NextFunction, Request, Response } from 'express';

import { ProductAlreadyExistsError } from '../../../exception/product-already-exists-error.js';
import { InvalidProductError } from '../../../entities/product-entity.js';
import type { CreateProductUseCase } from '../../../use-case/product/create-product-use-case.js';
import { createProductBodySchema } from '../../request/product/create-product-request.js';

export class CreateProductController {
  constructor(private readonly createProductUseCase: CreateProductUseCase) { }

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const input = createProductBodySchema.safeParse(request.body);
    if (!input.success) { 
      response.status(400).json({
        success: false,
        message: 'Verifique os dados informados.',
        errors: input.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const product = await this.createProductUseCase.execute({ ...input.data, imageAlt: input.data.imageAlt ?? '', isActive: input.data.isActive ?? true });
      response.status(201).json({
        success: true,
        message: 'Produto criado com sucesso.',
        data: { product },
      });
    } catch (error: unknown) {
      if (error instanceof ProductAlreadyExistsError) {
        response.status(409).json({ success: false, message: error.message });
        return;
      }
      if (error instanceof InvalidProductError) {
        response.status(400).json({ success: false, message: error.message });
        return;
      }

      next(error);
    }
  };
}
